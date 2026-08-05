import { init, miniApp, postEvent, themeParams } from "@tma.js/sdk";

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
}

let miniAppInstance: typeof miniApp | null = null;

function isTelegramEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  const telegramWindow = window as TelegramWindow;
  return Boolean(telegramWindow.Telegram?.WebApp);
}

export function waitForTelegramMiniApp(timeoutMs = 1500) {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (isTelegramEnvironment()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const intervalMs = 50;
    const interval = window.setInterval(() => {
      if (isTelegramEnvironment()) {
        window.clearInterval(interval);
        window.clearTimeout(timeout);
        resolve(true);
      }
    }, intervalMs);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      resolve(false);
    }, timeoutMs);
  });
}

export function initializeTelegramMiniApp() {
  if (miniAppInstance) {
    return miniAppInstance;
  }

  if (!isTelegramEnvironment()) {
    console.debug("[Telegram] WebApp environment not available yet.", {
      telegram:
        typeof window !== "undefined"
          ? (window as TelegramWindow).Telegram
          : undefined,
    });
    miniAppInstance = null;
    return miniAppInstance;
  }

  try {
    init();
    themeParams.mount();
    themeParams.bindCssVars();
    miniApp.mount();
    miniApp.bindCssVars();
    miniApp.ready();
    postEvent("web_app_expand");
    miniAppInstance = miniApp;
    console.debug("[Telegram] Mini App initialized successfully.");
  } catch (error) {
    console.warn("Telegram Mini App initialization failed.", error);
    miniAppInstance = null;
  }

  return miniAppInstance;
}

export function getTelegramMiniApp() {
  return miniAppInstance;
}

export function isTelegramMiniAppAvailable() {
  return isTelegramEnvironment();
}

export function getTelegramInitData() {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramWindow = window as TelegramWindow;
  const initData = telegramWindow.Telegram?.WebApp?.initData ?? null;
  console.debug("[Telegram] initData read", {
    initData,
    telegram: telegramWindow.Telegram,
  });
  return initData;
}
