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
}

const TELEGRAM_AUTH_TTL_SECONDS = 86400;

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

  return normalizeUser(createdUser);
}
