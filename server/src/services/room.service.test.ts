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
  resetRoomTeams,
  setRoomAdmin,
  shuffleRoomTeams,
  transferRoomOwnership,
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
      ownerId: room.ownerId ?? 1,
      ownerIds: room.ownerIds ?? [1],
      players: room.players ?? [],
      status: room.status ?? "waiting",
      settings: room.settings ?? {
        maxPlayers: ROOM_MAX_PLAYERS,
        allowSpectators: false,
        privateRoom: true,
        gameMode: "standard",
        timer: "60",
        language: "en",
        wordPack: "classic",
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
    assert.equal(room.settings.privateRoom, false);
    assert.equal(room.ownerId, 1);
    assert.deepEqual(room.ownerIds, [1]);
    assert.equal(room.players.length, 1);
    assert.equal(room.players[0]?.role, "operative");
    assert.equal(room.settings.language, "fa");
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

test("joinRoom rejects new players for private rooms", async () => {
  const originalFindByCode = roomRepository.findByCode;
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

  try {
    await assert.rejects(
      () =>
        joinRoom({
          roomCode: "abc123",
          telegramId: 2,
          displayName: "Guest",
        }),
      /private/i,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
  }
});

test("joinRoom adds late players as spectators after the game starts", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;
  const room = createRoomDocument({
    roomCode: "ABC123",
    status: "playing",
    settings: {
      maxPlayers: 2,
      allowSpectators: false,
      privateRoom: false,
      gameMode: "standard",
      timer: "60",
      language: "en",
      wordPack: "classic",
    },
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "late-user-id" },
    telegramId: 3,
  });

  try {
    const updatedRoom = await joinRoom({
      roomCode: "abc123",
      telegramId: 3,
      displayName: "Late spectator",
    });

    const latePlayer = updatedRoom.players.find(
      (player) => player.telegramId === 3,
    );
    assert.equal(latePlayer?.team, null);
    assert.equal(latePlayer?.role, "operative");
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("updateRoomSettings allows the room creator to make the room public", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
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
        userId: "1",
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
    _id: { toString: () => "db-user-id" },
    telegramId: 1,
  });

  try {
    const updatedRoom = await updateRoomSettings({
      roomCode: "ABC123",
      ownerTelegramId: 1,
      settings: {
        maxPlayers: 4,
        allowSpectators: false,
        privateRoom: false,
        gameMode: "standard",
        timer: "60",
        language: "en",
        wordPack: "classic",
      },
    });

    assert.equal(updatedRoom.settings.privateRoom, false);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("updateRoomPlayerAssignment allows a spectator when spectators are enabled", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const room = createRoomDocument({
    roomCode: "ABC123",
    settings: {
      maxPlayers: 4,
      allowSpectators: true,
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
      {
        userId: "player-id",
        telegramId: 2,
        displayName: "Player",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;

  try {
    const updatedRoom = await updateRoomPlayerAssignment({
      roomCode: "abc123",
      telegramId: 2,
      team: null,
      role: "operative",
    });

    assert.equal(updatedRoom.players[1]?.team, null);
    assert.equal(updatedRoom.players[1]?.role, "operative");
  } finally {
    roomRepository.findByCode = originalFindByCode;
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

test("transferRoomOwnership promotes a player inside the room to owner", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;
  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
    status: "waiting",
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
        userId: "guest-id",
        telegramId: 2,
        displayName: "Guest",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async (query: unknown) => {
    const telegramLookup = query as { telegramId?: number } | undefined;

    return telegramLookup?.telegramId === 1
      ? {
          _id: { toString: () => "owner-id" },
          telegramId: 1,
        }
      : null;
  };

  try {
    const updatedRoom = await transferRoomOwnership({
      roomCode: "ABC123",
      ownerTelegramId: 1,
      targetTelegramId: 2,
    });

    assert.equal(updatedRoom.ownerId, 1);
    assert.deepEqual(updatedRoom.ownerIds, [1, 2]);
    assert.deepEqual(room.ownerIds, [1, 2]);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("setRoomAdmin lets only the creator grant and revoke admin access", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFind = UserModel.find;
  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
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
        userId: "guest-id",
        telegramId: 2,
        displayName: "Guest",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });
  roomRepository.findByCode = async () => room;
  UserModel.find = (() => ({
    select: () => ({ exec: async () => [] }),
  })) as unknown as typeof UserModel.find;

  try {
    const promoted = await setRoomAdmin({
      roomCode: "ABC123",
      creatorTelegramId: 1,
      targetTelegramId: 2,
      isAdmin: true,
    });
    assert.deepEqual(promoted.ownerIds, [1, 2]);

    const revoked = await setRoomAdmin({
      roomCode: "ABC123",
      creatorTelegramId: 1,
      targetTelegramId: 2,
      isAdmin: false,
    });
    assert.deepEqual(revoked.ownerIds, [1]);

    await assert.rejects(
      setRoomAdmin({
        roomCode: "ABC123",
        creatorTelegramId: 2,
        targetTelegramId: 1,
        isAdmin: true,
      }),
      /Only the room creator can manage admins/,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
    UserModel.find = originalFind;
  }
});

test("shuffleRoomTeams fans the room into red and blue assignments", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
    status: "waiting",
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
        userId: "guest-id",
        telegramId: 2,
        displayName: "Guest",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "guest-2-id",
        telegramId: 3,
        displayName: "Guest Two",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "guest-3-id",
        telegramId: 4,
        displayName: "Guest Three",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "owner-id" },
    telegramId: 1,
  });

  try {
    const updatedRoom = await shuffleRoomTeams({
      roomCode: "ABC123",
      ownerTelegramId: 1,
    });

    assert.ok(updatedRoom.players.some((player) => player.team === "red"));
    assert.ok(updatedRoom.players.some((player) => player.team === "blue"));
    assert.equal(
      updatedRoom.players.filter((player) => player.team === "red").length,
      2,
    );
    assert.equal(
      updatedRoom.players.filter((player) => player.team === "blue").length,
      2,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("resetRoomTeams restores active players to a clean team allocation", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;

  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
    status: "waiting",
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
        userId: "guest-id",
        telegramId: 2,
        displayName: "Guest",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "guest-2-id",
        telegramId: 3,
        displayName: "Guest Two",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "owner-id" },
    telegramId: 1,
  });

  try {
    const updatedRoom = await resetRoomTeams({
      roomCode: "ABC123",
      ownerTelegramId: 1,
    });

    const redCount = updatedRoom.players.filter(
      (player) => player.team === "red",
    ).length;
    const blueCount = updatedRoom.players.filter(
      (player) => player.team === "blue",
    ).length;

    assert.equal(redCount, 0);
    assert.equal(blueCount, 0);
    assert.ok(updatedRoom.players.every((player) => player.team === null));
    assert.ok(
      updatedRoom.players.every((player) => player.role === "operative"),
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("updateRoomSettings validates the room settings payload", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindById = (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById;
  const room = createRoomDocument({
    status: "waiting",
    ownerId: 1,
    ownerIds: [1],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById = async () => ({
    telegramId: 1,
  });
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "owner-id" },
    telegramId: 1,
  });
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "owner-id" },
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
            gameMode: "standard",
            timer: "60",
            language: "en",
            wordPack: "classic",
          },
        }),
      /between 2 and 16/,
    );
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findById: (id: string) => Promise<unknown> }
    ).findById = originalFindById;
    (
      UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
    ).findOne = originalFindOne;
  }
});

test("updateRoomSettings accepts valid settings and persists them", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindById = (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById;

  const room = createRoomDocument({
    status: "waiting",
    ownerId: 1,
    ownerIds: [1],
  });

  roomRepository.findByCode = async () => room;
  (
    UserModel as unknown as { findById: (id: string) => Promise<unknown> }
  ).findById = async () => ({
    telegramId: 1,
  });

  try {
    const settings = {
      maxPlayers: ROOM_MAX_PLAYERS,
      allowSpectators: true,
      privateRoom: false,
      gameMode: "standard" as const,
      timer: "30" as const,
      language: "es" as const,
      wordPack: "party" as const,
    };

    const updated = await updateRoomSettings({
      roomCode: "abc123",
      ownerTelegramId: 1,
      settings,
    });

    assert.equal(updated.settings.maxPlayers, settings.maxPlayers);
    assert.equal(updated.settings.allowSpectators, settings.allowSpectators);
    assert.equal(updated.settings.privateRoom, settings.privateRoom);
    assert.equal(updated.settings.gameMode, "standard");
    assert.equal(updated.settings.timer, settings.timer);
    assert.equal(updated.settings.language, settings.language);
    assert.equal(updated.settings.wordPack, settings.wordPack);
  } finally {
    roomRepository.findByCode = originalFindByCode;
    (
      UserModel as unknown as { findById: (id: string) => Promise<unknown> }
    ).findById = originalFindById;
  }
});
