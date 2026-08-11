import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.route.js";
import { gameRouter } from "./routes/game.route.js";
import { healthRouter } from "./routes/health.route.js";
import { roomRouter } from "./routes/room.route.js";
import { wordRouter } from "./routes/word.route.js";
import avatarRouter from "./routes/avatar.route.js";
import { generateGhibliAvatarFromUrl } from "./services/avatar.service.js";
import { enqueueGhibliAvatarGeneration } from "./services/avatar.queue.js";
import { UserModel } from "./models/user.model.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use("/health", healthRouter);
  // Mount auth router at both /auth and /api/auth to support different
  // proxying setups (some deployments proxy only /api/* to the backend).
  app.use("/auth", authRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/rooms", roomRouter);
  app.use("/api/games", gameRouter);
  app.use("/api/words", wordRouter);
  app.use("/api/avatars", avatarRouter);

  // Background: auto-generate ghibli avatars for users with a source photo
  // when an avatar provider is configured. Runs non-blocking on startup.
  if (env.AVATAR_PROVIDER) {
    (async () => {
      try {
        const users = await UserModel.find({
          photoUrl: { $ne: null },
          ghibliAvatarUrl: null,
        })
          .select("telegramId photoUrl")
          .exec();

        // Enqueue generation tasks so retry/backoff and concurrency are handled
        for (const u of users) {
          if (u.photoUrl) {
            // fire-and-forget: enqueue and ignore result here
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            enqueueGhibliAvatarGeneration(
              u.telegramId,
              u.photoUrl as string,
            ).catch((e) => {
              console.debug("enqueue generation failed", e);
            });
          }
        }

        // eslint-disable-next-line no-console
        console.debug("avatar generation background enqueued");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("avatar generation background job failed", e);
      }
    })();
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
