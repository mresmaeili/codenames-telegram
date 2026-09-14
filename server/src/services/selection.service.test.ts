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

test("validateCardSelection allows replacing a pending selection", () => {
  const validation = validateCardSelection({
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
    cardId: "0",
  });

  assert.equal(validation.ok, true);
});

test("applyCardSelection keeps selections independent between operatives and cards", () => {
  const game = {
    status: "active" as const,
    currentTurn: "blue" as const,
    remainingGuesses: 2,
    currentHintWord: "forest",
    currentHintNumber: 2,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    board: [
      { word: "alpha", color: "red" as const, revealed: false },
      { word: "beta", color: "blue" as const, revealed: false },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    pendingSelections: [],
  };
  const room = {
    players: [
      {
        userId: "user-1",
        telegramId: 42,
        displayName: "Agent One",
        team: "blue" as const,
        role: "operative" as const,
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "user-2",
        telegramId: 43,
        displayName: "Agent Two",
        team: "blue" as const,
        role: "operative" as const,
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  };

  const firstSelection = applyCardSelection({
    game,
    room,
    senderTelegramId: 42,
    cardId: "0",
  }).game;
  const secondCardSelection = applyCardSelection({
    game: firstSelection,
    room,
    senderTelegramId: 42,
    cardId: "1",
  }).game;

  assert.deepEqual(
    secondCardSelection.pendingSelections?.map(({ cardId, playerId }) => ({
      cardId,
      playerId,
    })),
    [
      { cardId: "0", playerId: "user-1" },
      { cardId: "1", playerId: "user-1" },
    ],
  );

  const secondSelection = applyCardSelection({
    game: secondCardSelection,
    room,
    senderTelegramId: 43,
    cardId: "1",
  }).game;

  assert.deepEqual(secondSelection.pendingSelections, [
    {
      cardId: "0",
      playerId: "user-1",
      selectedAt: secondSelection.pendingSelections?.[0]?.selectedAt,
    },
    {
      cardId: "1",
      playerId: "user-1",
      selectedAt: secondSelection.pendingSelections?.[1]?.selectedAt,
    },
    {
      cardId: "1",
      playerId: "user-2",
      selectedAt: secondSelection.pendingSelections?.[2]?.selectedAt,
    },
  ]);

  const deselected = applyCardSelection({
    game: secondSelection,
    room,
    senderTelegramId: 42,
    cardId: "0",
  }).game;

  assert.deepEqual(
    deselected.pendingSelections?.map(({ cardId, playerId }) => ({
      cardId,
      playerId,
    })),
    [
      { cardId: "1", playerId: "user-1" },
      { cardId: "1", playerId: "user-2" },
    ],
  );
});

test("duplicate selection actions toggle the same operative selection once", () => {
  const game = {
    status: "active" as const,
    currentTurn: "blue" as const,
    remainingGuesses: 1,
    currentHintWord: "forest",
    currentHintNumber: 1,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    board: [{ word: "alpha", color: "blue" as const, revealed: false }],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    pendingSelections: [],
  };
  const room = {
    players: [
      {
        userId: "user-1",
        telegramId: 42,
        displayName: "Agent One",
        team: "blue" as const,
        role: "operative" as const,
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  };

  const selected = applyCardSelection({
    game,
    room,
    senderTelegramId: 42,
    cardId: "0",
  }).game;
  const toggled = applyCardSelection({
    game: selected,
    room,
    senderTelegramId: 42,
    cardId: "0",
  }).game;

  assert.deepEqual(toggled.pendingSelections, []);
  assert.equal(toggled.selectedCardId, null);
  assert.equal(toggled.selectedByPlayerId, null);
});
