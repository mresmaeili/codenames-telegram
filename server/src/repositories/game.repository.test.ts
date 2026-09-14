import assert from "node:assert/strict";
import test from "node:test";

import { GameModel } from "../models/game.model.js";
import { gameRepository } from "./game.repository.js";

test("concurrent reveal writes allow one compare-and-set winner", async () => {
  const originalFindOneAndUpdate = GameModel.findOneAndUpdate;
  const revision = new Date("2024-01-01T00:00:00.000Z");
  let storedRevision = revision;
  let stateVersion = 4;

  GameModel.findOneAndUpdate = ((filter: { updatedAt?: Date }) => ({
    exec: async () => {
      if (
        !filter.updatedAt ||
        filter.updatedAt.getTime() !== storedRevision.getTime()
      ) {
        return null;
      }
      storedRevision = new Date(storedRevision.getTime() + 1);
      stateVersion += 1;
      return { stateVersion, updatedAt: storedRevision };
    },
  })) as typeof GameModel.findOneAndUpdate;

  try {
    const revealUpdate = {
      board: [{ word: "alpha", color: "blue", revealed: true }],
      pendingSelections: [],
    };
    const [first, second] = await Promise.all([
      gameRepository.update("game-1", revealUpdate, revision),
      gameRepository.update("game-1", revealUpdate, revision),
    ]);

    assert.equal([first, second].filter(Boolean).length, 1);
    assert.equal(
      await gameRepository.update("game-1", revealUpdate, revision),
      null,
    );
  } finally {
    GameModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
