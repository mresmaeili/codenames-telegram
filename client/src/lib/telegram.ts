import { init, miniApp, postEvent, themeParams } from "@tma.js/sdk";

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
}

let initialized = false;
let miniAppInstance: typeof miniApp | null = null;

function isTelegramEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  const telegramWindow = window as TelegramWindow;
  const available = Boolean(telegramWindow.Telegram?.WebApp);
  console.debug("isTelegramEnvironment", {
    telegram: telegramWindow.Telegram,
    telegramWebApp: telegramWindow.Telegram?.WebApp,
    available,
  });
  return available;
}

export function initializeTelegramMiniApp() {
  if (initialized) {
    return miniAppInstance;
  }

  console.debug("initializeTelegramMiniApp start", {
    telegram: (window as any).Telegram,
    telegramWebApp: (window as any).Telegram?.WebApp,
  });

  initialized = true;

  if (!isTelegramEnvironment()) {
    miniAppInstance = null;
    return miniAppInstance;
  }

  try {
    init();
    console.debug("initializeTelegramMiniApp after init", {
      telegram: (window as any).Telegram,
      telegramWebApp: (window as any).Telegram?.WebApp,
    });
    themeParams.mount();
    themeParams.bindCssVars();
    miniApp.mount();
    console.debug("initializeTelegramMiniApp after miniApp.mount", {
      telegram: (window as any).Telegram,
      telegramWebApp: (window as any).Telegram?.WebApp,
    });
    miniApp.bindCssVars();
    miniApp.ready();
    console.debug("initializeTelegramMiniApp after miniApp.ready", {
      telegram: (window as any).Telegram,
      telegramWebApp: (window as any).Telegram?.WebApp,
    });
    postEvent("web_app_expand");
    miniAppInstance = miniApp;
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
  return telegramWindow.Telegram?.WebApp?.initData ?? null;
}
