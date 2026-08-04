import assert from "node:assert/strict";
import test from "node:test";

import {
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
} from "../../../shared/src/constants/room.js";
import { UserModel } from "../models/user.model.js";
import { roomRepository } from "../repositories/room.repository.js";
import {
  createRoom,
  joinRoom,
  updateRoomPlayerAssignment,
  updateRoomSettings,
} from "./room.service.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";

test("createRoom creates a waiting room with default settings", async () => {
  const originalCreate = roomRepository.create;
  const originalFindByCode = roomRepository.findByCode;
  roomRepository.create = async (room) => {
    const created = createRoomDocument({
      roomCode: room.roomCode ?? "ABC123",
      ownerId: room.ownerId ?? "owner-id",
      players: room.players ?? [],
      status: room.status ?? "waiting",
      settings: room.settings ?? {
        maxPlayers: ROOM_MAX_PLAYERS,
        allowSpectators: false,
        privateRoom: true,
      },
    });

    return created;
  };
  roomRepository.findByCode = async () => null;

  try {
    const room = await createRoom({
      ownerId: "owner-id",
      ownerTelegramId: 1,
      ownerDisplayName: "Owner",
    });

    assert.equal(room.status, "waiting");
    assert.equal(room.settings.maxPlayers, ROOM_MAX_PLAYERS);
    assert.equal(room.settings.allowSpectators, false);
    assert.equal(room.players.length, 1);
    assert.equal(room.players[0]?.role, "operative");
  } finally {
    roomRepository.create = originalCreate;
    roomRepository.findByCode = originalFindByCode;
  }
});

test("joinRoom adds a new player and normalizes the room code", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  roomRepository.findByCode = async () =>
    createRoomDocument({
      roomCode: "ABC123",
      players: [
        createRoomDocument({}).players[0] as {
          userId: string;
          telegramId: number;
          displayName: string;
          team: "red" | null;
          role: "spymaster" | "operative";
          joinedAt: Date;
        },
      ],
    });

  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "user-2" },
    telegramId: 2,
  });

  try {
    const room = await joinRoom({
      roomCode: "abc123",
      telegramId: 2,
      displayName: "Guest",
    });

    assert.equal(room.roomCode, "ABC123");
    assert.equal(room.players.length, 2);
    assert.equal(room.players[1]?.displayName, "Guest");
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("updateRoomPlayerAssignment rejects a second spymaster in the same team", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const room = createRoomDocument({
    roomCode: "ABC123",
    players: [
      {
        userId: "owner-id",
        telegramId: 1,
        displayName: "Owner",
        team: "red",
        role: "spymaster",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "player-id",
        telegramId: 2,
        displayName: "Player",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;

  try {
    await assert.rejects(
      () =>
        updateRoomPlayerAssignment({
          roomCode: "abc123",
          telegramId: 2,
          team: "red",
          role: "spymaster",
        }),
      /Maximum one Spymaster per team/,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
  }
});

test("updateRoomSettings validates the room settings payload", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindById = (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById;
  const room = createRoomDocument({
    status: "waiting",
    ownerId: "owner-id",
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById = async () => ({
    telegramId: 1,
  });

  try {
    await assert.rejects(
      () =>
        updateRoomSettings({
          roomCode: "abc123",
          ownerTelegramId: 1,
          settings: {
            maxPlayers: ROOM_MIN_PLAYERS - 1,
            allowSpectators: false,
            privateRoom: true,
          },
        }),
      /between 2 and 16/,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findById: (id: string) => Promise<unknown> }
    ).findById = originalFindById;
  }
});
