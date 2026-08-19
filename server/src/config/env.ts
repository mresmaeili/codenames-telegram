import { config as loadDotenv } from "dotenv";

loadDotenv({ path: [".env", "../.env"] });

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
  // Avatar generation provider configuration (optional)
  AVATAR_PROVIDER: process.env.AVATAR_PROVIDER ?? "",
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ?? "",
  REPLICATE_MODEL_VERSION: process.env.REPLICATE_MODEL_VERSION ?? "",
  // Queue tuning for avatar generation
  AVATAR_CONCURRENCY: process.env.AVATAR_CONCURRENCY ?? "3",
  AVATAR_MAX_RETRIES: process.env.AVATAR_MAX_RETRIES ?? "3",
  AVATAR_BASE_DELAY_MS: process.env.AVATAR_BASE_DELAY_MS ?? "1000",
};
