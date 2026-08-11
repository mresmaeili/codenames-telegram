import { Router } from "express";

import { env } from "../config/env.js";
import {
  getWordPools,
  saveWordPool,
  type WordPoolInput,
} from "../services/word.service.js";

export const wordRouter = Router();

wordRouter.get("/pools", async (_request, response) => {
  try {
    const pools = await getWordPools();
    response.status(200).json({ pools });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch word pools.";
    response.status(500).json({ message });
  }
});

wordRouter.post("/pools", async (request, response) => {
  try {
    const body = request.body as {
      name?: unknown;
      language?: unknown;
      words?: unknown;
      isDefault?: unknown;
      adminKey?: unknown;
    };

    if (
      typeof body.name !== "string" ||
      typeof body.language !== "string" ||
      !Array.isArray(body.words) ||
      typeof body.adminKey !== "string"
    ) {
      response.status(400).json({ message: "Invalid word pool payload." });
      return;
    }

    const expectedAdminKey = env.ADMIN_KEY || env.TELEGRAM_BOT_TOKEN;
    if (expectedAdminKey && body.adminKey !== expectedAdminKey) {
      response.status(403).json({ message: "Admin access required." });
      return;
    }

    const input: WordPoolInput = {
      name: body.name,
      language:
        body.language === "fa" || body.language === "en" ? body.language : "fa",
      words: body.words.map((word) => String(word)),
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : false,
      adminKey: body.adminKey,
    };

    const pool = await saveWordPool(input);
    response.status(201).json({ pool });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save word pool.";
    response.status(400).json({ message });
  }
});
