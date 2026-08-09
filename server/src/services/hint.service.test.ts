import assert from "node:assert/strict";
import test from "node:test";

import { applyHintSubmission, validateHintSubmission } from "./hint.service.js";

test("validateHintSubmission rejects a hint when the sender is not the active spymaster", () => {
  const validation = validateHintSubmission({
    game: {
      status: "active",
      currentTurn: "blue",
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      hintHistory: [],
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

test("applyHintSubmission sets the active hint for a valid active team spymaster", () => {
  const result = applyHintSubmission({
    game: {
      status: "active",
      currentTurn: "red",
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      remainingGuesses: 0,
      hintHistory: [],
    },
    room: {
      players: [
        {
          userId: "user-1",
          telegramId: 10,
          displayName: "Agent One",
          team: "red",
          role: "spymaster",
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    },
    senderTelegramId: 10,
    word: "forest",
    number: 3,
  });

  assert.equal(result.game.currentHintWord, "forest");
  assert.equal(result.game.currentHintNumber, 3);
  assert.equal(result.game.remainingGuesses, 4);
  assert.equal(result.game.hintHistory.length, 1);
  assert.equal(result.game.hintHistory[0].word, "forest");
  assert.equal(result.game.hintHistory[0].number, 3);
  assert.equal(result.game.hintHistory[0].team, "red");
  assert.ok(result.game.hintHistory[0].submittedAt instanceof Date);
  assert.ok(result.game.hintSubmittedAt instanceof Date);
});
