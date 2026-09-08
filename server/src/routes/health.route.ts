import { Router } from "express";

import { getDatabaseHealthStatus } from "../database/mongo.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  const database = getDatabaseHealthStatus();
  const healthy = database.status === "connected";

  response.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "unavailable",
    database,
  });
});
