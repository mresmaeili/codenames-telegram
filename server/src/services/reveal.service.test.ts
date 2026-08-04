import assert from "node:assert/strict";
import test from "node:test";

import { applyCardReveal, validateCardReveal } from "./reveal.service.js";

test("applyCardReveal reveals the selected card and clears the pending selection", () => {
  const result = applyCardReveal({
    game: {
      status: "active",
      currentTurn: "blue",
      currentHintWord: "forest",
      currentHintNumber: 2,
      board: [{ word: "alpha", color: "red", revealed: false }],
      selectedCardId: "0",
      selectedByPlayerId: "user-1",
      selectedAt: new Date("2024-01-01T00:00:00.000Z"),
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
  });

  assert.equal(result.game.board[0]?.revealed, true);
  assert.equal(result.game.board[0]?.color, "red");
  assert.equal(result.game.selectedCardId, null);
  assert.equal(result.game.selectedByPlayerId, null);
  assert.equal(result.game.selectedAt, null);
});

test("validateCardReveal rejects a reveal when no card is selected", () => {
  const validation = validateCardReveal({
    game: {
      status: "active",
      currentTurn: "blue",
      currentHintWord: "forest",
      currentHintNumber: 2,
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
  });

  assert.equal(validation.ok, false);
  assert.equal(
    validation.error,
    "A selected card is required before revealing.",
  );
});
