import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { env } from "@/config/env";
import {
  initializeTelegramMiniApp,
  waitForTelegramMiniApp,
} from "@/lib/telegram";
import { createSocketClient } from "@/socket/client";
import "@/styles/index.css";

async function bootstrap() {
  const telegramAvailable = await waitForTelegramMiniApp(2000);

  console.debug("[Main] Telegram environment check", {
    telegramAvailable,
    telegram:
      typeof window !== "undefined" ? (window as any).Telegram : undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
    location: typeof window !== "undefined" ? window.location.href : undefined,
  });

  initializeTelegramMiniApp();
  createSocketClient({ endpoint: env.SOCKET_URL });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
