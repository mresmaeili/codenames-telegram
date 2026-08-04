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
  return Boolean(telegramWindow.Telegram?.WebApp);
}

export function initializeTelegramMiniApp() {
  if (initialized) {
    return miniAppInstance;
  }

  initialized = true;

  if (!isTelegramEnvironment()) {
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
