import "dotenv/config";

function parsePort(value: string | undefined) {
  const fallbackPort = 3001;

  if (!value) {
    return fallbackPort;
  }

  const parsedPort = Number(value);

  return Number.isInteger(parsedPort) && parsedPort > 0
    ? parsedPort
    : fallbackPort;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DEV_MODE:
    process.env.DEV_MODE === "true" || process.env.NODE_ENV !== "production",
  PORT: parsePort(process.env.PORT),
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "",
  ADMIN_KEY: process.env.ADMIN_KEY ?? "",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
