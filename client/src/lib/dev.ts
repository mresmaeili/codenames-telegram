import { env } from "@/config/env";

export interface DevUser {
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

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

function normalizeUserName(value: string | null): string {
  if (!value) {
    return "Developer";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Developer";
  }

  return trimmed;
}

function computeTelegramIdFromName(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  const normalized = Math.abs(hash) % 900000000;
  return normalized + 100000000;
}

export function isDevModeEnabled(): boolean {
  if (env.DEV_MODE) {
    return true;
  }

  const devParam = getQueryParam("dev");
  return devParam === "1" || devParam === "true";
}

export function getDevModeUser(): DevUser | null {
  if (!isDevModeEnabled() || typeof window === "undefined") {
    return null;
  }

  const rawUser = getQueryParam("user") || getQueryParam("username") || "Developer";
  const firstName = normalizeUserName(rawUser);
  const telegramIdParam = Number(getQueryParam("telegramId"));
  const telegramId = Number.isFinite(telegramIdParam) && telegramIdParam > 0
    ? telegramIdParam
    : computeTelegramIdFromName(firstName);

  const timestamp = new Date().toISOString();

  return {
    telegramId,
    username: firstName.toLowerCase().replace(/[^a-z0-9]/gi, "") || null,
    firstName,
    lastName: null,
    photoUrl: null,
    languageCode: "en",
    lastLoginAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getDevModeInfo() {
  const user = getDevModeUser();
  const room = getQueryParam("room")?.trim().toUpperCase() || null;
  return { user, room };
}

export function getDevModeUrl(userName: string, roomCode?: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const url = new URL(window.location.href);
  url.searchParams.set("dev", "1");
  url.searchParams.set("user", userName);

  if (roomCode) {
    url.searchParams.set("room", roomCode);
  }

  return url.toString();
}
