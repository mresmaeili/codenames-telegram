import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

import { createApp } from "../app.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";
import { gameRepository } from "../repositories/game.repository.js";
import { RoomModel } from "../models/room.model.js";

async function startTestServer() {
  const app = createApp();
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test("POST /api/games/:gameId/hint returns 404 for missing game", async () => {
  const originalFindById = gameRepository.findById;
  gameRepository.findById = async () => null;

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/games/unknown-game/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: 10,
        word: "forest",
        number: 2,
      }),
    });

    assert.equal(response.status, 404);
  } finally {
    gameRepository.findById = originalFindById;
    server.close();
  }
});

test("POST /api/games/:gameId/hint accepts a valid hint and returns the updated game", async () => {
  const originalFindById = gameRepository.findById;
  const originalUpdate = gameRepository.update;
  const originalRoomFindById = RoomModel.findById;

  const room = createRoomDocument({ roomCode: "ABC123" });
  const game = {
    _id: "game-id",
    roomId: room._id,
    status: "active",
    board: [
      { word: "apple", color: "red", revealed: false },
      { word: "banana", color: "blue", revealed: false },
    ],
    startingTeam: "red",
    currentTurn: "red",
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
  } as const;

  const updatedGame = {
    ...game,
    currentHintWord: "forest",
    currentHintNumber: 2,
    remainingGuesses: 2,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    hintHistory: [
      {
        word: "forest",
        number: 2,
        team: "red",
        submittedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  } as const;

  gameRepository.findById = async () => game as any;
  RoomModel.findById = () => ({ exec: async () => room }) as any;
  gameRepository.update = async () => updatedGame as any;

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/games/game-id/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: 1,
        word: "forest",
        number: 2,
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.currentHintWord, "forest");
    assert.equal(payload.currentHintNumber, 2);
    assert.equal(payload.remainingGuesses, 2);
    assert.equal(typeof payload.hintSubmittedAt, "string");
    assert.equal(Array.isArray(payload.hintHistory), true);
    assert.equal(payload.hintHistory.length, 1);
    assert.equal(payload.hintHistory[0].word, "forest");
    assert.equal(payload.hintHistory[0].number, 2);
    assert.equal(payload.hintHistory[0].team, "red");
  } finally {
    gameRepository.findById = originalFindById;
    gameRepository.update = originalUpdate;
    RoomModel.findById = originalRoomFindById;
    server.close();
  }
});
