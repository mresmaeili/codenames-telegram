import { Router } from "express";
import {
  generateGhibliAvatarFromUrl,
  clearGhibliAvatar,
} from "../services/avatar.service.js";
import { queueStatus } from "../services/avatar.queue.js";
import { UserModel } from "../models/user.model.js";

const router = Router();

// Request generation of a Ghibli-inspired avatar for a user.
// Body: { telegramId: number }
router.post("/ghibli", async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId || typeof telegramId !== "number") {
      res.status(400).json({ message: "telegramId is required." });
      return;
    }

    const user = await UserModel.findOne({ telegramId }).exec();
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Prefer existing photoUrl as source.
    if (!user.photoUrl) {
      res.status(400).json({ message: "User does not have a source photo." });
      return;
    }

    // enqueue generation and return 202 (non-blocking). Client should poll
    // the room/user state to pick up the new `ghibliAvatarUrl` when ready.
    void (async () => {
      try {
        const { enqueueGhibliAvatarGeneration } =
          await import("../services/avatar.queue.js");
        await enqueueGhibliAvatarGeneration(
          telegramId,
          user.photoUrl as string,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("enqueue generation failed", e);
      }
    })();

    res.status(202).json({
      message: "Generation enqueued.",
      queue: queueStatus(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: "Avatar generation failed." });
  }
});

// Clear generated avatar
router.post("/ghibli/clear", async (req, res) => {
  try {
    const { telegramId } = req.body;
    if (!telegramId || typeof telegramId !== "number") {
      res.status(400).json({ message: "telegramId is required." });
      return;
    }

    await clearGhibliAvatar(telegramId);
    res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: "Failed to clear avatar." });
  }
});

// Queue status for monitoring
router.get("/queue/status", (_req, res) => {
  try {
    res.json(queueStatus());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).json({ message: "Failed to retrieve queue status." });
  }
});

export default router;
