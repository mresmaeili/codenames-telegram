import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyGameState } from "./stateVersion";

test("accepts reconnect snapshots for the same or newer game version", () => {
  assert.equal(
    shouldApplyGameState(
      { gameId: "game-1", stateVersion: 4 },
      { gameId: "game-1", stateVersion: 4 },
    ),
    true,
  );
  assert.equal(
    shouldApplyGameState(
      { gameId: "game-1", stateVersion: 4 },
      { gameId: "game-1", stateVersion: 5 },
    ),
    true,
  );
});

test("ignores stale snapshots but accepts a new game after reconnect", () => {
  assert.equal(
    shouldApplyGameState(
      { gameId: "game-1", stateVersion: 5 },
      { gameId: "game-1", stateVersion: 4 },
    ),
    false,
  );
  assert.equal(
    shouldApplyGameState(
      { gameId: "game-1", stateVersion: 5 },
      { gameId: "game-2", stateVersion: 0 },
    ),
    true,
  );
});
