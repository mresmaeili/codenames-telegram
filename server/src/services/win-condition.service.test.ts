import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGameCompletion,
  validateGameplayAction,
} from "./win-condition.service.js";

test("evaluateGameCompletion declares the revealing team victorious when all of its cards are revealed", () => {
  const result = evaluateGameCompletion({
    game: {
      status: "active",
      currentTurn: "blue",
      startingTeam: "blue",
      remainingGuesses: 1,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [
        { word: "alpha", color: "blue", revealed: true },
        { word: "bravo", color: "blue", revealed: true },
      ],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: null,
      completionReason: null,
      completedAt: null,
    },
  });

  assert.equal(result.completed, true);
  assert.equal(result.winningTeam, "blue");
  assert.equal(result.completionReason, "all-blue-cards-revealed");
});

test("evaluateGameCompletion uses the revealing team's turn before turn resolution", () => {
  const result = evaluateGameCompletion({
    game: {
      status: "active",
      currentTurn: "blue",
      startingTeam: "blue",
      remainingGuesses: 1,
      currentHintWord: "forest",
      currentHintNumber: 1,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [
        { word: "alpha", color: "blue", revealed: true },
        { word: "bravo", color: "blue", revealed: true },
        { word: "charlie", color: "red", revealed: false },
      ],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: null,
      completionReason: null,
      completedAt: null,
    },
  });

  assert.equal(result.completed, true);
  assert.equal(result.winningTeam, "blue");
  assert.equal(result.completionReason, "all-blue-cards-revealed");
});

test("evaluateGameCompletion declares the opposing team victorious when the assassin is revealed", () => {
  const result = evaluateGameCompletion({
    game: {
      status: "active",
      currentTurn: "red",
      startingTeam: "blue",
      remainingGuesses: 1,
      currentHintWord: "forest",
      currentHintNumber: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
      board: [
        { word: "alpha", color: "assassin", revealed: true },
        { word: "bravo", color: "blue", revealed: false },
        { word: "charlie", color: "neutral", revealed: false },
      ],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: null,
      completionReason: null,
      completedAt: null,
    },
  });

  assert.equal(result.completed, true);
  assert.equal(result.winningTeam, "blue");
  assert.equal(result.completionReason, "assassin-revealed");
});

test("evaluateGameCompletion still resolves an assassin reveal even when the status was already set to finished", () => {
  const result = evaluateGameCompletion({
    game: {
      status: "finished",
      currentTurn: "red",
      startingTeam: "blue",
      remainingGuesses: 0,
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      board: [
        { word: "alpha", color: "assassin", revealed: true },
        { word: "bravo", color: "blue", revealed: false },
      ],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: null,
      completionReason: null,
      completedAt: null,
    },
  });

  assert.equal(result.completed, true);
  assert.equal(result.winningTeam, "blue");
  assert.equal(result.completionReason, "assassin-revealed");
});

test("validateGameplayAction rejects gameplay after completion", () => {
  const validation = validateGameplayAction({
    game: {
      status: "finished",
      currentTurn: "blue",
      startingTeam: "blue",
      remainingGuesses: 0,
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      board: [],
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: "red",
      completionReason: "assassin-revealed",
      completedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "Game has already finished.");
});
