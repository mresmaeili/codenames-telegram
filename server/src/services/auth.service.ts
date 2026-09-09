import crypto from "node:crypto";

import { UserModel, type TelegramUserRecord } from "../models/user.model.js";
import {
  validate as tmaValidate,
  parse as tmaParse,
  SignatureInvalidError,
  SignatureMissingError,
  AuthDateInvalidError,
  ExpiredError,
} from "@tma.js/init-data-node";

export interface TelegramInitDataPayload {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  };
  auth_date: number;
  hash: string;
}

export interface AuthenticatedUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  avatarId?: string | null;
}

export interface TelegramWidgetAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  language_code?: string;
}

const TELEGRAM_AUTH_TTL_SECONDS = 86400;
const GUEST_AUTH_TTL_SECONDS = 30 * 86400;

export interface GuestAuthenticatedUser extends AuthenticatedUser {
  guestToken: string;
}

interface GuestTokenPayload {
  guestId: string;
  telegramId: number;
  displayName: string;
  avatarId?: string;
  expiresAt: number;
}

function encodeGuestToken(payload: GuestTokenPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function decodeGuestToken(token: string, secret: string): GuestTokenPayload {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid guest session.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new Error("Invalid guest session.");
  }

  let payload: GuestTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as GuestTokenPayload;
  } catch {
    throw new Error("Invalid guest session.");
  }

  if (
    !payload.guestId ||
    !payload.displayName ||
    !Number.isInteger(payload.telegramId) ||
    payload.telegramId <= 0 ||
    payload.expiresAt < Math.floor(Date.now() / 1000)
  ) {
    throw new Error("Guest session has expired.");
  }

  return payload;
}

function guestTelegramId(guestId: string): number {
  const digest = crypto.createHash("sha256").update(guestId).digest();
  return Math.max(1, digest.readUInt32BE(0) & 0x7fffffff);
}

function guestUserFromPayload(
  payload: GuestTokenPayload,
  token: string,
): GuestAuthenticatedUser {
  const timestamp = new Date().toISOString();
  return {
    telegramId: payload.telegramId,
    username: null,
    firstName: payload.displayName,
    lastName: null,
    photoUrl: null,
    languageCode: null,
    lastLoginAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    avatarId: payload.avatarId ?? null,
    guestToken: token,
  };
}

function parseInitData(initData: string): URLSearchParams {
  return new URLSearchParams(initData);
}

function buildTelegramCheckString(initData: string): string {
  const params = new URLSearchParams(initData);
  const entries = Array.from(params.entries())
    // Exclude fields that should not be part of the data-check string.
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

function verifyTelegramInitData(
  initData: string,
  hashSecret: string,
): TelegramInitDataPayload {
  // Use the official package to validate the initData.
  try {
    tmaValidate(initData, hashSecret, { expiresIn: TELEGRAM_AUTH_TTL_SECONDS });
  } catch (e: any) {
    console.debug(
      "[Auth Verify] validation error from init-data library",
      e?.name || e?.message || e,
    );

    // If the library says signature invalid, try a legacy fallback where the
    // bot token is used directly as the HMAC key (some tests/clients use this).
    if (SignatureInvalidError.is?.(e)) {
      console.debug(
        "[Auth Verify] signature invalid according to library, attempting legacy token-key fallback",
      );

      // Legacy fallback: compute HMAC with bot token as key over the
      // data-check-string (decoded values) and compare.
      const params = parseInitData(initData);
      const providedHash = params.get("hash");
      const authDateValue = Number(params.get("auth_date"));

      if (!providedHash || !authDateValue) {
        throw new Error("Invalid telegram init data.");
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (currentTimestamp - authDateValue > TELEGRAM_AUTH_TTL_SECONDS) {
        throw new Error("Telegram init data has expired.");
      }

      const checkString = buildTelegramCheckString(initData);
      const legacyHash = crypto
        .createHmac("sha256", hashSecret)
        .update(checkString, "utf8")
        .digest("hex");

      try {
        const a = Buffer.from(legacyHash, "hex");
        const b = Buffer.from(providedHash, "hex");
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          // Legacy match — parse the user payload manually (avoid tmaParse)
          const rawUser = params.get("user");
          if (!rawUser) throw new Error("Telegram user payload is missing.");
          let parsedUser: TelegramInitDataPayload["user"] | null = null;
          try {
            parsedUser = JSON.parse(rawUser) as TelegramInitDataPayload["user"];
          } catch (pe) {
            console.debug("[Auth Verify] legacy user JSON parse failed", pe);
            throw new Error("Telegram user payload is invalid JSON.");
          }

          if (!parsedUser?.id || !parsedUser.first_name) {
            throw new Error("Telegram user payload is invalid.");
          }

          return {
            user: parsedUser,
            auth_date: authDateValue,
            hash: providedHash,
          };
        }
      } catch (cmpErr) {
        // fall through to rethrow below
        console.debug("[Auth Verify] legacy HMAC comparison failed", cmpErr);
      }
    }

    if (SignatureMissingError.is?.(e)) {
      throw new Error("Invalid telegram init data.");
    }
    if (AuthDateInvalidError.is?.(e)) {
      throw new Error("Invalid telegram auth date.");
    }
    if (ExpiredError.is?.(e)) {
      throw new Error("Telegram init data has expired.");
    }

    console.debug("[Auth Verify] unknown validation error", e);
    throw new Error("Telegram init data signature is invalid.");
  }

  const parsed = tmaParse(initData);
  const authDateValue = Number(parsed.auth_date);
  const authHash = parsed.hash as string;

  if (!parsed.user || !authDateValue || !authHash) {
    console.debug(
      "[Auth Verify] parsed initData missing required fields",
      parsed,
    );
    throw new Error("Invalid telegram init data.");
  }

  return {
    user: parsed.user as TelegramInitDataPayload["user"],
    auth_date: authDateValue,
    hash: authHash,
  };
}

function normalizeUser(user: TelegramUserRecord): AuthenticatedUser {
  return {
    telegramId: user.telegramId,
    username: user.username ?? null,
    firstName: user.firstName,
    lastName: user.lastName ?? null,
    photoUrl: user.photoUrl ?? null,
    languageCode: user.languageCode ?? null,
    lastLoginAt: user.lastLoginAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function authenticateTelegramUser(
  initData: string,
): Promise<AuthenticatedUser> {
  if (!initData.trim()) {
    throw new Error("Telegram init data is required.");
  }

  const hashSecret = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!hashSecret) {
    throw new Error("Telegram bot token is not configured.");
  }

  const authData = verifyTelegramInitData(initData, hashSecret);
  const telegramUser = authData.user;

  if (!telegramUser) {
    throw new Error("Telegram user payload is missing.");
  }

  const existingUser = await UserModel.findOne({ telegramId: telegramUser.id });
  const now = new Date();

  if (existingUser) {
    existingUser.username = telegramUser.username ?? null;
    existingUser.firstName = telegramUser.first_name;
    existingUser.lastName = telegramUser.last_name ?? null;
    existingUser.photoUrl = telegramUser.photo_url ?? null;
    existingUser.languageCode = telegramUser.language_code ?? null;
    existingUser.lastLoginAt = now;
    await existingUser.save();

    // Trigger background avatar generation if provider configured and
    // user has a source photo but no ghibli avatar yet.
    if (existingUser.photoUrl && !existingUser.ghibliAvatarUrl) {
      // enqueue generation task (non-blocking) so retry/backoff applies
      void (async () => {
        try {
          const { enqueueGhibliAvatarGeneration } =
            await import("./avatar.queue.js");
          await enqueueGhibliAvatarGeneration(
            existingUser.telegramId,
            existingUser.photoUrl as string,
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug("background avatar generation enqueue failed", e);
        }
      })();
    }

    return normalizeUser(existingUser);
  }

  const createdUser = await UserModel.create({
    telegramId: telegramUser.id,
    username: telegramUser.username ?? null,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name ?? null,
    photoUrl: telegramUser.photo_url ?? null,
    languageCode: telegramUser.language_code ?? null,
    lastLoginAt: now,
  });

  // Trigger background generation for newly created users
  if (createdUser.photoUrl) {
    void (async () => {
      try {
        const { enqueueGhibliAvatarGeneration } =
          await import("./avatar.queue.js");
        await enqueueGhibliAvatarGeneration(
          createdUser.telegramId,
          createdUser.photoUrl as string,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("background avatar generation enqueue failed", e);
      }
    })();
  }

  return normalizeUser(createdUser);
}

function verifyTelegramWidgetData(
  data: TelegramWidgetAuthData,
  botToken: string,
): TelegramWidgetAuthData {
  const { hash, ...fields } = data;
  const checkString = Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");
  const provided = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new Error("Telegram login signature is invalid.");
  }

  const age = Math.floor(Date.now() / 1000) - data.auth_date;
  if (age < 0 || age > TELEGRAM_AUTH_TTL_SECONDS) {
    throw new Error("Telegram login data has expired.");
  }

  return data;
}

export async function authenticateTelegramWidgetUser(
  data: TelegramWidgetAuthData,
): Promise<AuthenticatedUser> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!botToken) {
    throw new Error("Telegram bot token is not configured.");
  }

  const verifiedData = verifyTelegramWidgetData(data, botToken);
  const now = new Date();
  const existingUser = await UserModel.findOne({ telegramId: verifiedData.id });

  if (existingUser) {
    existingUser.username = verifiedData.username ?? null;
    existingUser.firstName = verifiedData.first_name;
    existingUser.lastName = verifiedData.last_name ?? null;
    existingUser.photoUrl = verifiedData.photo_url ?? null;
    existingUser.languageCode = verifiedData.language_code ?? null;
    existingUser.lastLoginAt = now;
    await existingUser.save();
    return normalizeUser(existingUser);
  }

  const createdUser = await UserModel.create({
    telegramId: verifiedData.id,
    username: verifiedData.username ?? null,
    firstName: verifiedData.first_name,
    lastName: verifiedData.last_name ?? null,
    photoUrl: verifiedData.photo_url ?? null,
    languageCode: verifiedData.language_code ?? null,
    lastLoginAt: now,
  });

  return normalizeUser(createdUser);
}

export function createGuestUser(
  displayName: string,
  requestedGuestId?: string,
  avatarId?: string,
): GuestAuthenticatedUser {
  const normalizedName = displayName.trim().replace(/\s+/g, " ");
  if (normalizedName.length < 2 || normalizedName.length > 24) {
    throw new Error("Username must be between 2 and 24 characters.");
  }

  const guestId = requestedGuestId?.trim() || crypto.randomUUID();
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(guestId)) {
    throw new Error("Invalid guest session identifier.");
  }

  const payload: GuestTokenPayload = {
    guestId,
    telegramId: guestTelegramId(guestId),
    displayName: normalizedName,
    avatarId: avatarId?.trim() || undefined,
    expiresAt: Math.floor(Date.now() / 1000) + GUEST_AUTH_TTL_SECONDS,
  };
  const secret =
    process.env.GUEST_AUTH_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    "guest-auth-secret";
  const token = encodeGuestToken(payload, secret);
  return guestUserFromPayload(payload, token);
}

export function authenticateGuestToken(token: string): GuestAuthenticatedUser {
  const secret =
    process.env.GUEST_AUTH_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    "guest-auth-secret";
  const payload = decodeGuestToken(token, secret);
  return guestUserFromPayload(payload, token);
}
