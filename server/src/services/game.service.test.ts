import test from "node:test";
import assert from "node:assert/strict";

import { buildGameBoard, buildGameView } from "./game.service.js";
import { DEFAULT_FARSI_WORDS } from "./word.service.js";

test("buildGameView returns a public board for operatives and a colorized board for spymasters", () => {
  const board = [
    { word: "alpha", color: "red" as const, revealed: false },
    { word: "bravo", color: "blue" as const, revealed: false },
    { word: "charlie", color: "neutral" as const, revealed: false },
  ];

  const operativeView = buildGameView({
    roomId: "room-1",
    status: "active",
    board,
    startingTeam: "blue",
    currentTurn: "blue",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    hintHistory: [],
    rounds: [
      {
        id: "round-1",
        team: "blue",
        hint: {
          word: "forest",
          number: 2,
          team: "blue",
          submittedAt: new Date("2024-01-01T00:00:00.000Z"),
          playerId: "spymaster-1",
        },
        guesses: [
          {
            word: "alpha",
            cardIndex: 0,
            playerId: "operative-1",
            correct: false,
            revealedAt: new Date("2024-01-01T00:00:01.000Z"),
          },
        ],
      },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    role: "operative",
  });

  assert.equal(operativeView.role, "operative");
  assert.equal(operativeView.redCardsRemaining, 1);
  assert.equal(operativeView.blueCardsRemaining, 1);
  assert.equal(operativeView.phase, "spymaster");
  assert.equal(operativeView.rounds?.[0]?.guesses.length, 1);
  assert.equal(operativeView.rounds?.[0]?.hint.playerId, "spymaster-1");
  assert.deepEqual(operativeView.board, [
    { word: "alpha", revealed: false, color: null },
    { word: "bravo", revealed: false, color: null },
    { word: "charlie", revealed: false, color: null },
  ]);

  const spymasterView = buildGameView({
    roomId: "room-1",
    status: "active",
    board,
    startingTeam: "blue",
    currentTurn: "blue",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    hintHistory: [],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    role: "spymaster",
  });

  assert.equal(spymasterView.role, "spymaster");
  assert.deepEqual(spymasterView.board, [
    { word: "alpha", color: "red", revealed: false },
    { word: "bravo", color: "blue", revealed: false },
    { word: "charlie", color: "neutral", revealed: false },
  ]);
});

test("buildGameView reveals the full board to operatives after game completion", () => {
  const board = [
    { word: "alpha", color: "red" as const, revealed: false },
    { word: "bravo", color: "blue" as const, revealed: true },
  ];

  const finishedView = buildGameView({
    roomId: "room-1",
    status: "finished",
    board,
    startingTeam: "blue",
    currentTurn: "red",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    hintHistory: [],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: "blue",
    completionReason: "all-blue-cards-revealed",
    completedAt: new Date("2024-01-01T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    role: "operative",
  });

  assert.deepEqual(finishedView.board, [
    { word: "alpha", revealed: false, color: "red" },
    { word: "bravo", revealed: true, color: "blue" },
  ]);
});

test("buildGameBoard creates 25 unique cards with the expected color distribution when red starts", () => {
  const board = buildGameBoard(
    [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
      "india",
      "juliet",
      "kilo",
      "lima",
      "mike",
      "november",
      "oscar",
      "papa",
      "quebec",
      "romeo",
      "sierra",
      "tango",
      "uniform",
      "victor",
      "whiskey",
      "xray",
      "yankee",
    ],
    "red",
  );

  assert.equal(board.length, 25);
  assert.equal(new Set(board.map((card) => card.word)).size, 25);

  const colorCounts = board.reduce<Record<string, number>>((counts, card) => {
    if (card.color) {
      counts[card.color] = (counts[card.color] ?? 0) + 1;
    }
    return counts;
  }, {});

  assert.equal(colorCounts.red, 9);
  assert.equal(colorCounts.blue, 8);
  assert.equal(colorCounts.neutral, 7);
  assert.equal(colorCounts.assassin, 1);
});

test("buildGameBoard selects 25 unique Persian words from the default pool", () => {
  const board = buildGameBoard(DEFAULT_FARSI_WORDS, "blue");

  assert.equal(board.length, 25);
  assert.equal(new Set(board.map((card) => card.word)).size, 25);
  assert.ok(board.every((card) => DEFAULT_FARSI_WORDS.includes(card.word)));
});

test("buildGameBoard creates 25 unique cards with the expected color distribution when blue starts", () => {
  const board = buildGameBoard(
    [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
      "india",
      "juliet",
      "kilo",
      "lima",
      "mike",
      "november",
      "oscar",
      "papa",
      "quebec",
      "romeo",
      "sierra",
      "tango",
      "uniform",
      "victor",
      "whiskey",
      "xray",
      "yankee",
    ],
    "blue",
  );

  assert.equal(board.length, 25);
  assert.equal(new Set(board.map((card) => card.word)).size, 25);

  const colorCounts = board.reduce<Record<string, number>>((counts, card) => {
    if (card.color) {
      counts[card.color] = (counts[card.color] ?? 0) + 1;
    }
    return counts;
  }, {});

  assert.equal(colorCounts.red, 8);
  assert.equal(colorCounts.blue, 9);
  assert.equal(colorCounts.neutral, 7);
  assert.equal(colorCounts.assassin, 1);
});
