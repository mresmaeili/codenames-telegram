import { Router } from "express";

import { authenticateTelegramUser } from "../services/auth.service.js";

interface TelegramAuthRequestBody {
  initData?: unknown;
}

export const authRouter = Router();

authRouter.post("/telegram", async (request, response, next) => {
  try {
    const body = request.body as TelegramAuthRequestBody;

    if (typeof body.initData !== "string" || !body.initData.trim()) {
      response.status(400).json({ message: "Telegram init data is required." });
      return;
    }

    const user = await authenticateTelegramUser(body.initData);

    response.status(200).json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed.";

    if (
      message.includes("expired") ||
      message.includes("signature") ||
      message.includes("Invalid")
    ) {
      response.status(401).json({ message });
      return;
    }

    next(error);
  }
});
