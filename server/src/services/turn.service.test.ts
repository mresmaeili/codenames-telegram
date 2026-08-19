import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTurnOutcome,
  applyTurnPass,
  validateTurnPass,
} from "./turn.service.js";

test("applyTurnOutcome decrements remaining guesses for a correct card", () => {
  const result = applyTurnOutcome({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "blue", revealed: false }],
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
    revealedCardColor: "blue",
  });

  assert.equal(result.game.remainingGuesses, 1);
  assert.equal(result.game.currentTurn, "blue");
  assert.equal(result.game.currentHintWord, "forest");
});

test("applyTurnOutcome changes teams after the final allowed guess", () => {
  const result = applyTurnOutcome({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 1,
      currentHintWord: "forest",
      currentHintNumber: 0,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "blue", revealed: false }],
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
    revealedCardColor: "blue",
  });

  assert.equal(result.game.currentTurn, "red");
  assert.equal(result.game.remainingGuesses, 0);
  assert.equal(result.game.currentHintWord, null);
  assert.equal(result.game.currentHintNumber, null);
});

test("applyTurnOutcome switches teams for a wrong card", () => {
  const result = applyTurnOutcome({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
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
    revealedCardColor: "red",
  });

  assert.equal(result.game.currentTurn, "red");
  assert.equal(result.game.remainingGuesses, 0);
  assert.equal(result.game.currentHintWord, null);
  assert.equal(result.game.currentHintNumber, null);
});

test("applyTurnOutcome clears the pending selection after a correct reveal", () => {
  const result = applyTurnOutcome({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "blue", revealed: true }],
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
    revealedCardColor: "blue",
  });

  assert.equal(result.game.remainingGuesses, 1);
  assert.equal(result.game.selectedCardId, null);
  assert.equal(result.game.selectedByPlayerId, null);
  assert.equal(result.game.selectedAt, null);
});

test("applyTurnOutcome leaves assassin completion to the win condition service", () => {
  const result = applyTurnOutcome({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "assassin", revealed: true }],
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
    revealedCardColor: "assassin",
  });

  assert.equal(result.game.status, "active");
  assert.equal(result.game.remainingGuesses, 0);
  assert.equal(result.game.currentHintWord, null);
  assert.equal(result.game.selectedCardId, null);
});

test("validateTurnPass rejects a pass for a non-active operative", () => {
  const validation = validateTurnPass({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
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
          team: "red",
          role: "operative",
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    },
    senderTelegramId: 42,
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "Sender must belong to the active team.");
});

test("applyTurnPass switches turns and clears the active hint", () => {
  const result = applyTurnPass({
    game: {
      status: "active",
      currentTurn: "blue",
      remainingGuesses: 2,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [{ word: "alpha", color: "blue", revealed: false }],
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

  assert.equal(result.game.currentTurn, "red");
  assert.equal(result.game.remainingGuesses, 0);
  assert.equal(result.game.currentHintWord, null);
  assert.equal(result.game.currentHintNumber, null);
});
