import { useEffect, useState } from "react";

import { env } from "@/config/env";
import {
  getTelegramInitData,
  getTelegramLaunchParams,
  initializeTelegramMiniApp,
  isTelegramMiniAppAvailable,
  waitForTelegramMiniApp,
} from "@/lib/telegram";

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Authentication failed. Please try again.";
}

interface AuthenticatedUser {
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

interface AuthState {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
}

let authRequestPromise: Promise<AuthenticatedUser | null> | null = null;

async function authenticateWithServer(
  initData: string,
): Promise<AuthenticatedUser | null> {
  // In production we serve the frontend from the same origin and Nginx
  // typically proxies /api/* to the backend. Use the relative /api path
  // when the configured API base equals the current origin. In dev we
  // keep the explicit backend URL (eg. http://localhost:3001).
  const isSameOrigin =
    typeof window !== "undefined" &&
    env.API_BASE_URL === window.location.origin;
  const url = isSameOrigin
    ? "/api/auth/telegram"
    : `${env.API_BASE_URL.replace(/\/$/, "")}/auth/telegram`;
  console.debug("[Auth] authenticating with server", {
    url,
    initDataLength: initData.length,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) {
    throw new Error("Authentication failed.");
  }

  const payload = (await response.json()) as { user: AuthenticatedUser };
  return payload.user;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function runAuthentication() {
      const telegramAvailable = await waitForTelegramMiniApp(2000);

      console.debug("[Auth] Telegram availability check", {
        telegramAvailable,
        telegram:
          typeof window !== "undefined" ? (window as any).Telegram : undefined,
      });

      if (!telegramAvailable || !isTelegramMiniAppAvailable()) {
        setAuthState({
          user: null,
          loading: false,
          error:
            "Telegram is unavailable here. Please open the Mini App inside Telegram.",
        });
        return;
      }

      initializeTelegramMiniApp();

      const launchParams = await getTelegramLaunchParams();
      console.debug("[Auth] launch parameters", { launchParams });

      const initData = (await getTelegramInitData()) ?? "";

      // If enabled, compute and log a client-side SHA256 of the initData so
      // it can be compared with the server-side hash without sharing raw
      // initData. This helps detect proxies or body modifications.
      async function computeClientSha256(input: string) {
        try {
          const enc = new TextEncoder();
          const data = enc.encode(input);
          const hashBuffer = await (
            window.crypto.subtle as SubtleCrypto
          ).digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        } catch (e) {
          console.debug("[Auth Debug] computeClientSha256 failed", e);
          return null;
        }
      }

      if (env.DEBUG_AUTH_HASH && initData) {
        const clientHash = await computeClientSha256(initData);
        console.debug(
          "[Auth Debug] Client initData SHA256:",
          clientHash,
          "len:",
          initData.length,
        );
      }

      if (!initData) {
        setAuthState({
          user: null,
          loading: false,
          error:
            "Unable to read your Telegram session. Please reopen the Mini App.",
        });
        return;
      }

      if (!initData) {
        setAuthState({
          user: null,
          loading: false,
          error:
            "Unable to read your Telegram session. Please reopen the Mini App.",
        });
        return;
      }

      if (authRequestPromise) {
        try {
          const user = await authRequestPromise;
          setAuthState({ user, loading: false, error: null });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Authentication failed.";
          setAuthState({ user: null, loading: false, error: message });
        }
        return;
      }

      authRequestPromise = authenticateWithServer(initData)
        .then((user) => {
          setAuthState({ user, loading: false, error: null });
          return user;
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "Authentication failed.";
          setAuthState({ user: null, loading: false, error: message });
          throw error;
        });

      try {
        await authRequestPromise;
      } catch {
        authRequestPromise = null;
      }
    }

    void runAuthentication();
  }, []);

  return authState;
}
