import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { env } from "@/config/env";
import { getDevModeUser, isDevModeEnabled } from "@/lib/dev";
import {
  getTelegramInitData,
  initializeTelegramMiniApp,
  waitForTelegramMiniApp,
} from "@/lib/telegram";
import { createSocketClient } from "@/socket/client";
import "@/styles/index.css";

async function bootstrap() {
  const devMode = isDevModeEnabled();

  if (devMode) {
    console.debug(
      "[Main] Dev mode enabled, skipping Telegram SDK initialization.",
    );
  } else {
    const telegramAvailable = await waitForTelegramMiniApp(2000);

    console.debug("[Main] Telegram environment check", {
      telegramAvailable,
      telegram:
        typeof window !== "undefined" ? (window as any).Telegram : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      platform:
        typeof navigator !== "undefined" ? navigator.platform : undefined,
      location:
        typeof window !== "undefined" ? window.location.href : undefined,
    });

    initializeTelegramMiniApp();
  }

  const initData = devMode ? null : await getTelegramInitData();
  const devUser = devMode ? getDevModeUser() : null;
  createSocketClient({
    endpoint: env.SOCKET_URL,
    auth: devMode
      ? { dev: true, telegramId: devUser?.telegramId }
      : initData
        ? { initData }
        : undefined,
  });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
