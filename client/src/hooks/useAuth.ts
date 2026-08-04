import { useEffect, useState } from "react";

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Authentication failed. Please try again.";
}

import {
  getTelegramInitData,
  isTelegramMiniAppAvailable,
} from "@/lib/telegram";

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
  const response = await fetch("http://localhost:3001/auth/telegram", {
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
      if (!isTelegramMiniAppAvailable()) {
        setAuthState({
          user: null,
          loading: false,
          error:
            "Telegram is unavailable here. Please open the Mini App inside Telegram.",
        });
        return;
      }

      const initData = getTelegramInitData() ?? "";

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
