import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { env } from "@/config/env";
import { initializeTelegramMiniApp } from "@/lib/telegram";
import { createSocketClient } from "@/socket/client";
import "@/styles/index.css";

console.debug("main.tsx start", {
  readyState: document.readyState,
  telegram: (window as any).Telegram,
  telegramWebApp: (window as any).Telegram?.WebApp,
});

initializeTelegramMiniApp();
createSocketClient({ endpoint: env.SOCKET_URL });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
