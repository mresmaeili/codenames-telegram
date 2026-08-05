import crypto from "node:crypto";

import { UserModel, type TelegramUserRecord } from "../models/user.model.js";

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
  const params = parseInitData(initData);
  const authHash = params.get("hash");
  const authDate = params.get("auth_date");

  console.debug(
    "[Auth Verify] Parsed initData keys",
    Array.from(params.keys()),
  );

  if (!authHash || !authDate) {
    console.debug("[Auth Verify] Missing hash or auth_date", {
      hasHash: !!authHash,
      hasAuthDate: !!authDate,
    });
    throw new Error("Invalid telegram init data.");
  }

  const authDateValue = Number(authDate);
  if (!Number.isInteger(authDateValue)) {
    console.debug("[Auth Verify] auth_date is not an integer", { authDate });
    throw new Error("Invalid telegram auth date.");
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const age = currentTimestamp - authDateValue;
  console.debug("[Auth Verify] auth_date check", {
    authDateValue,
    age,
    ttl: TELEGRAM_AUTH_TTL_SECONDS,
  });
  if (age > TELEGRAM_AUTH_TTL_SECONDS) {
    console.debug("[Auth Verify] initData expired", { age });
    throw new Error("Telegram init data has expired.");
  }

  // Build the data-check string from the same entries used above so the
  // logged `sorted keys` and the string are consistent.
  const entriesForCheck = Array.from(params.entries())
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right));

  const checkString = entriesForCheck
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Derive the HMAC key as SHA-256(bot_token) (binary) per Telegram's
  // verification specification, then compute HMAC-SHA256 over the
  // data-check string using that derived key.
  const derivedKey = crypto.createHash("sha256").update(hashSecret).digest();
  const calculatedHash = crypto
    .createHmac("sha256", derivedKey)
    .update(checkString, "utf8")
    .digest("hex");

  // Timing-safe comparison and debug outputs (prefixes only).
  try {
    const a = Buffer.from(calculatedHash, "hex");
    const b = Buffer.from(authHash as string, "hex");
    const sameLength = a.length === b.length;
    const matches = sameLength && crypto.timingSafeEqual(a, b);

    console.debug(
      "[Auth Verify Debug] sorted keys",
      entriesForCheck.map((e) => e[0]),
    );
    const truncate = (s: string, n = 200) =>
      s.length > n ? s.slice(0, n) + "..." : s;
    console.debug(
      "[Auth Verify Debug] data-check-string",
      truncate(checkString, 1000),
    );
    console.debug(
      "[Auth Verify Debug] calculatedHmacPrefix",
      calculatedHash.slice(0, 16),
    );
    console.debug(
      "[Auth Verify Debug] receivedHashPrefix",
      (authHash as string).slice(0, 16),
    );
    console.debug("[Auth Verify] HMAC comparison result", { matches });

    if (!matches) {
      console.debug("[Auth Verify] HMAC mismatch");
      throw new Error("Telegram init data signature is invalid.");
    }
  } catch (e) {
    console.debug("[Auth Verify] HMAC comparison failed", e);
    throw new Error("Telegram init data signature is invalid.");
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    console.debug("[Auth Verify] user param missing in initData");
    throw new Error("Telegram user payload is missing.");
  }

  let parsedUser: TelegramInitDataPayload["user"] | null = null;
  try {
    parsedUser = JSON.parse(rawUser) as TelegramInitDataPayload["user"];
  } catch (e) {
    console.debug("[Auth Verify] user JSON parse failed", e);
    throw new Error("Telegram user payload is invalid JSON.");
  }

  if (!parsedUser?.id || !parsedUser.first_name) {
    console.debug("[Auth Verify] parsed user missing required fields", {
      hasId: !!parsedUser?.id,
      hasFirstName: !!parsedUser?.first_name,
    });
    throw new Error("Telegram user payload is invalid.");
  }

  return {
    user: parsedUser,
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
