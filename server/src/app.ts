import express from "express";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.route.js";
import { gameRouter } from "./routes/game.route.js";
import { healthRouter } from "./routes/health.route.js";
import { roomRouter } from "./routes/room.route.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/api/rooms", roomRouter);
  app.use("/api/games", gameRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
