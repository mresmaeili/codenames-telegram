import { Router } from "express";

import { getDatabaseHealthStatus } from "../database/mongo.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    database: getDatabaseHealthStatus(),
  });
});
