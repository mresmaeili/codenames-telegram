import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { env } from "@/config/env";
import { initializeTelegramMiniApp } from "@/lib/telegram";
import { createSocketClient } from "@/socket/client";
import "@/styles/index.css";

initializeTelegramMiniApp();
createSocketClient({ endpoint: env.SOCKET_URL });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
