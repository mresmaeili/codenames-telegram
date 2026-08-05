import {
  init,
  isTMA,
  miniApp,
  postEvent,
  retrieveLaunchParams,
  retrieveRawInitData,
  themeParams,
} from "@tma.js/sdk";

let miniAppInstance: typeof miniApp | null = null;

function isTelegramEnvironment() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return isTMA();
  } catch (error) {
    console.debug("[Telegram] isTMA() check failed.", error);
    return false;
  }
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
    console.debug("[Telegram] TMA environment not available yet.");
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

export async function getTelegramInitData() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const initData = await retrieveRawInitData();
    console.debug("[Telegram] retrieveRawInitData result", { initData });
    return initData ?? null;
  } catch (error) {
    console.debug("[Telegram] retrieveRawInitData failed.", error);
    return null;
  }
}

export async function getTelegramLaunchParams() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const launchParams = await retrieveLaunchParams();
    console.debug("[Telegram] retrieveLaunchParams result", { launchParams });
    return launchParams;
  } catch (error) {
    console.debug("[Telegram] retrieveLaunchParams failed.", error);
    return null;
  }
}
