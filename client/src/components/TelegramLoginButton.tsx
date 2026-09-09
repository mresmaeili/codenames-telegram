import { useEffect, useRef } from "react";

import { env } from "@/config/env";
import { type TelegramWidgetAuthData, useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    onTelegramAuth?: (data: TelegramWidgetAuthData) => void;
  }
}

export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loginWithTelegramWidget } = useAuth();

  useEffect(() => {
    if (!env.TELEGRAM_BOT_USERNAME || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    window.onTelegramAuth = (data) => {
      void loginWithTelegramWidget(data);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = env.TELEGRAM_BOT_USERNAME;
    script.dataset.size = "large";
    script.dataset.onauth = "onTelegramAuth(user)";
    script.dataset.requestAccess = "write";
    container.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
      container.replaceChildren();
    };
  }, [loginWithTelegramWidget]);

  if (!env.TELEGRAM_BOT_USERNAME) {
    return null;
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
