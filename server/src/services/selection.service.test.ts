import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCardSelection,
  validateCardSelection,
} from "./selection.service.js";

test("applyCardSelection updates the selected card for an active operative after an active hint exists", () => {
  const result = applyCardSelection({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 1,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "red", revealed: false }],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
    },
    room: {
      players: [
        {
          userId: "user-1",
          telegramId: 42,
          displayName: "Agent One",
          team: "blue",
          role: "operative",
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    },
    senderTelegramId: 42,
    cardId: "0",
  });

  assert.equal(result.game.selectedCardId, "0");
  assert.equal(result.game.selectedByPlayerId, "user-1");
  assert.ok(result.game.selectedAt instanceof Date);
});

test("validateCardSelection rejects a guess when no remaining guesses are available", () => {
  const validation = validateCardSelection({
    game: {
      status: "active",
      currentTurn: "blue",
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      remainingGuesses: 0,
      board: [{ word: "alpha", color: "blue", revealed: false }],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
    },
    room: {
      players: [
        {
          userId: "user-1",
          telegramId: 42,
          displayName: "Agent One",
          team: "blue",
          role: "operative",
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    },
    senderTelegramId: 42,
    cardId: "0",
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "No remaining guesses are available.");
});
