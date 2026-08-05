import { Router } from "express";
import crypto from "node:crypto";

import { authenticateTelegramUser } from "../services/auth.service.js";

interface TelegramAuthRequestBody {
  initData?: unknown;
}

export const authRouter = Router();

authRouter.post("/telegram", async (request, response, next) => {
  try {
    const body = request.body as TelegramAuthRequestBody;
    // Debug: log a SHA256 of the received initData and its length so we can
    // compare client vs server without printing the raw initData.
    if (typeof body.initData === "string") {
      try {
        const initDataHash = crypto
          .createHash("sha256")
          .update(body.initData)
          .digest("hex");
        // Use console.debug so this can be toggled via environment or log level
        console.debug(
          "[Auth Debug] Received initData SHA256:",
          initDataHash,
          "len:",
          body.initData.length,
        );
      } catch (e) {
        console.debug("[Auth Debug] Failed to hash initData.", e);
      }
    }

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
