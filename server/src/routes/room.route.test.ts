import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

import { createApp } from "../app.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";
import { roomRepository } from "../repositories/room.repository.js";
import { UserModel } from "../models/user.model.js";

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

test("POST /api/rooms returns 201 for a valid room creation request", async () => {
  const originalCreate = roomRepository.create;
  const originalFindByCode = roomRepository.findByCode;
  roomRepository.create = async (room) =>
    createRoomDocument({
      roomCode: room.roomCode ?? "ABC123",
      ownerId: room.ownerId ?? "owner-id",
      players: room.players ?? [],
      status: room.status ?? "waiting",
      settings: room.settings ?? {
        maxPlayers: 4,
        allowSpectators: false,
        privateRoom: true,
        gameMode: "standard",
        timer: "60",
        language: "en",
        wordPack: "classic",
      },
    });
  roomRepository.findByCode = async () => null;

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerId: "owner-id",
        ownerTelegramId: 1,
        ownerDisplayName: "Owner",
      }),
    });

    assert.equal(response.status, 201);
    const payload = (await response.json()) as { roomCode: string };
    assert.ok(payload.roomCode.length > 0);
  } finally {
    roomRepository.create = originalCreate;
    roomRepository.findByCode = originalFindByCode;
    server.close();
  }
});

test("GET /api/rooms/:roomCode returns 404 for unknown rooms", async () => {
  const originalFindByCode = roomRepository.findByCode;
  roomRepository.findByCode = async () => null;

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/rooms/UNKNOWN`);
    assert.equal(response.status, 404);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    server.close();
  }
});

test("POST /api/rooms/join rejects new players in private rooms", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  const room = createRoomDocument({
    roomCode: "ABC123",
    settings: {
      maxPlayers: 4,
      allowSpectators: false,
      privateRoom: true,
      gameMode: "standard",
      timer: "60",
      language: "en",
      wordPack: "classic",
    },
    players: [
      {
        userId: "owner-id",
        telegramId: 1,
        displayName: "Owner",
        team: "red",
        role: "spymaster",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => null;

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/rooms/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: "abc123",
        telegramId: 2,
        displayName: "Guest",
      }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.message, /private/i);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
    server.close();
  }
});

// The following public-room join test is optional but useful for validating privateRoom gating.
test("POST /api/rooms/join accepts new players in public rooms", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  const room = createRoomDocument({
    roomCode: "ABC123",
    settings: {
      maxPlayers: 4,
      allowSpectators: false,
      privateRoom: false,
      gameMode: "standard",
      timer: "60",
      language: "en",
      wordPack: "classic",
    },
    players: [
      {
        userId: "owner-id",
        telegramId: 1,
        displayName: "Owner",
        team: "red",
        role: "spymaster",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "user-2" },
    telegramId: 2,
  });

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/rooms/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: "abc123",
        telegramId: 2,
        displayName: "Guest",
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.roomCode, "ABC123");
    assert.equal(payload.players.length, 2);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
    server.close();
  }
});
