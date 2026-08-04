type ImportMetaEnvShape = ImportMetaEnv & {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SOCKET_URL?: string;
};

const importMetaEnv = import.meta.env as ImportMetaEnvShape;
const isProduction = importMetaEnv.MODE === "production";

export const env = {
  APP_NAME: importMetaEnv.VITE_APP_NAME ?? "Codenames Telegram Mini App",
  API_BASE_URL:
    importMetaEnv.VITE_API_BASE_URL ??
    (isProduction ? window.location.origin : "http://localhost:3001"),
  SOCKET_URL:
    importMetaEnv.VITE_SOCKET_URL ??
    (isProduction ? window.location.origin : "http://localhost:3001"),
};
