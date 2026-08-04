import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

import { createApp } from "../app.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";
import { roomRepository } from "../repositories/room.repository.js";

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
