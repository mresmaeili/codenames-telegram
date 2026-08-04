import assert from "node:assert/strict";
import test from "node:test";

import { validateHintSubmission } from "./hint.service.js";

test("validateHintSubmission rejects a hint when the sender is not the active spymaster", () => {
  const validation = validateHintSubmission({
    game: {
      status: "active",
      currentTurn: "blue",
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      remainingGuesses: 0,
    },
    room: {
      players: [
        {
          userId: "user-1",
          telegramId: 42,
          displayName: "Agent One",
          team: "red",
          role: "spymaster",
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    },
    senderTelegramId: 42,
    word: "  ",
    number: 2,
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "Sender must belong to the active team.");
});
