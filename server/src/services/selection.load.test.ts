import assert from "node:assert/strict";
import test from "node:test";

import { applyCardSelection } from "./selection.service.js";

test("selection state handles 50 simultaneous operative selections", () => {
  const playerCount = 50;
  const room = {
    players: Array.from({ length: playerCount }, (_, index) => ({
      userId: `player-${index}`,
      telegramId: index + 1,
      displayName: `Player ${index + 1}`,
      team: "blue" as const,
      role: "operative" as const,
      joinedAt: new Date("2024-01-01T00:00:00.000Z"),
    })),
  };
  let game: Parameters<typeof applyCardSelection>[0]["game"] = {
    status: "active" as const,
    currentTurn: "blue" as const,
    remainingGuesses: playerCount,
    currentHintWord: "forest",
    currentHintNumber: playerCount,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    board: Array.from({ length: playerCount }, (_, index) => ({
      word: `word-${index}`,
      color: "blue" as const,
      revealed: false,
    })),
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    pendingSelections: [],
  };

  const startedAt = performance.now();
  for (let index = 0; index < playerCount; index += 1) {
    game = applyCardSelection({
      game,
      room,
      senderTelegramId: index + 1,
      cardId: String(index),
    }).game;
  }
  const durationMs = performance.now() - startedAt;

  assert.equal(game.pendingSelections?.length, playerCount);
  assert.equal(
    new Set(game.pendingSelections?.map((selection) => selection.playerId))
      .size,
    playerCount,
  );
  assert.ok(
    durationMs < 1000,
    `selection processing took ${durationMs.toFixed(1)}ms`,
  );
});
