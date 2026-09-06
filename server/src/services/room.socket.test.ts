import assert from "node:assert/strict";
import test from "node:test";

import { registerRoomSocketHandlers } from "../sockets/room.socket.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";
import { gameRepository } from "../repositories/game.repository.js";
import { roomRepository } from "../repositories/room.repository.js";
import { RoomModel } from "../models/room.model.js";
import { GameModel } from "../models/game.model.js";
import { UserModel } from "../models/user.model.js";
import { WordPoolModel } from "../models/word.model.js";

interface ConnectedSocketMock {
  data: { telegramId: number };
  emit: (event: string, payload: unknown) => void;
}

function createIoMock(
  emitted: Array<{ event: string; payload: unknown }>,
  connectedSockets: ConnectedSocketMock[],
) {
  return {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ event, payload });
      },
    }),
    in: () => ({
      fetchSockets: async () => connectedSockets,
    }),
  };
}

function createConnectedSocket(
  telegramId: number,
  emitted: Array<{ event: string; payload: unknown }>,
) {
  return {
    data: { telegramId },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
}

test("registerRoomSocketHandlers handles duplicate room joins without crashing", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
    data: { telegramId: 2 },
    join: async () => undefined,
    leave: async () => undefined,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    on: (event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    },
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[1];

  const io = {
    to: () => ({ emit: () => undefined }),
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[0];

  roomRepository.findByCode = async () =>
    createRoomDocument({ roomCode: "ABC123" });
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => ({
    _id: { toString: () => "user-2" },
    telegramId: 2,
  });

  registerRoomSocketHandlers(io, socket);

  const joinHandler = handlers.get("room:join");
  if (!joinHandler) {
    throw new Error("room:join handler was not registered.");
  }

  await joinHandler({
    roomCode: "abc123",
    telegramId: 2,
    displayName: "Guest",
  });

  assert.equal(
    emitted.some((event) => event.event === "room:joined"),
    false,
  );

  roomRepository.findByCode = originalFindByCode;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = originalFindOne;
});

test("registerRoomSocketHandlers persists a valid hint without a duplicate event", async () => {
  const originalFindById = gameRepository.findById;
  const originalUpdate = gameRepository.update;
  const originalRoomFindOne = RoomModel.findOne;

  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
    data: { telegramId: 10 },
    join: async () => undefined,
    leave: async () => undefined,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    on: (event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    },
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[1];

  const room = createRoomDocument({
    roomCode: "ABC123",
    players: [
      {
        userId: "user-1",
        telegramId: 10,
        displayName: "Agent One",
        team: "red",
        role: "spymaster",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "user-2",
        telegramId: 11,
        displayName: "Agent Two",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  const game = {
    _id: "game-id",
    roomId: "room-id",
    status: "active",
    currentTurn: "red",
    startingTeam: "red",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    board: [
      { word: "apple", color: "red", revealed: false },
      { word: "banana", color: "blue", revealed: false },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
  };

  const io = createIoMock(emitted, [
    createConnectedSocket(10, emitted),
    createConnectedSocket(11, emitted),
  ]) as unknown as Parameters<typeof registerRoomSocketHandlers>[0];

  gameRepository.findById = async () => game as any;
  RoomModel.findOne = () => ({ exec: async () => room }) as any;
  gameRepository.update = async () =>
    ({
      ...game,
      currentHintWord: "forest",
      currentHintNumber: 2,
      remainingGuesses: 2,
      hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    }) as any;

  registerRoomSocketHandlers(io, socket);

  const hintHandler = handlers.get("game:hint");
  if (!hintHandler) {
    throw new Error("game:hint handler was not registered.");
  }

  await hintHandler({
    gameId: "game-id",
    roomCode: "abc123",
    telegramId: 10,
    word: "forest",
    number: 2,
  });

  assert.equal(
    emitted.some((event) => event.event === "game:hinted"),
    false,
  );
  const stateEvents = emitted.filter((event) => event.event === "game:state");
  assert.equal(stateEvents.length, 2);
  const spymasterState = stateEvents.find(
    (event) =>
      (event.payload as { game: { role: string } }).game.role === "spymaster",
  );
  const operativeState = stateEvents.find(
    (event) =>
      (event.payload as { game: { role: string } }).game.role === "operative",
  );
  assert.equal(
    (spymasterState?.payload as { game: { currentHintWord: string } }).game
      .currentHintWord,
    "forest",
  );
  assert.equal(
    (operativeState?.payload as { game: { currentHintWord: string } }).game
      .currentHintWord,
    "forest",
  );
  assert.equal(
    (
      operativeState?.payload as {
        game: { board: Array<{ color: string | null }> };
      }
    ).game.board[0]?.color,
    null,
  );

  gameRepository.findById = originalFindById;
  gameRepository.update = originalUpdate;
  RoomModel.findOne = originalRoomFindOne;
});

test("registerRoomSocketHandlers persists a valid card reveal without a duplicate event", async () => {
  const originalFindById = gameRepository.findById;
  const originalUpdate = gameRepository.update;
  const originalRoomFindOne = RoomModel.findOne;

  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
    data: { telegramId: 10 },
    join: async () => undefined,
    leave: async () => undefined,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    on: (event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    },
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[1];

  const io = createIoMock(emitted, [
    createConnectedSocket(10, emitted),
  ]) as unknown as Parameters<typeof registerRoomSocketHandlers>[0];

  const room = createRoomDocument({
    roomCode: "ABC123",
    players: [
      {
        userId: "user-1",
        telegramId: 10,
        displayName: "Agent One",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  const game = {
    _id: "game-id",
    roomId: "room-id",
    status: "active",
    currentTurn: "red",
    startingTeam: "red",
    remainingGuesses: 1,
    currentHintWord: "forest",
    currentHintNumber: 2,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    hintHistory: [],
    board: [
      { word: "apple", color: "red", revealed: false },
      { word: "banana", color: "blue", revealed: false },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
  };

  const updatedGame = {
    ...game,
    board: [
      { word: "apple", color: "red", revealed: true },
      { word: "banana", color: "blue", revealed: false },
    ],
    remainingGuesses: 0,
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
  };

  gameRepository.findById = async () => game as any;
  RoomModel.findOne = () => ({ exec: async () => room }) as any;
  gameRepository.update = async () => updatedGame as any;

  registerRoomSocketHandlers(io, socket);

  const selectHandler = handlers.get("game:select");
  if (!selectHandler) {
    throw new Error("game:select handler was not registered.");
  }

  await selectHandler({
    gameId: "game-id",
    roomCode: "abc123",
    telegramId: 10,
    cardId: "0",
  });

  assert.equal(
    emitted.some((event) => event.event === "game:revealed"),
    false,
  );

  gameRepository.findById = originalFindById;
  gameRepository.update = originalUpdate;
  RoomModel.findOne = originalRoomFindOne;
});

test("registerRoomSocketHandlers completes selection confirmation and reveal", async () => {
  const originalFindById = gameRepository.findById;
  const originalUpdate = gameRepository.update;
  const originalRoomFindOne = RoomModel.findOne;

  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
    data: { telegramId: 10 },
    join: async () => undefined,
    leave: async () => undefined,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    on: (event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    },
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[1];

  const io = createIoMock(emitted, [
    createConnectedSocket(10, emitted),
  ]) as unknown as Parameters<typeof registerRoomSocketHandlers>[0];

  const room = createRoomDocument({
    roomCode: "ABC123",
    players: [
      {
        userId: "user-1",
        telegramId: 10,
        displayName: "Agent One",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  const game = {
    _id: "game-id",
    roomId: "room-id",
    status: "active",
    currentTurn: "blue",
    startingTeam: "blue",
    remainingGuesses: 2,
    currentHintWord: "forest",
    currentHintNumber: 1,
    hintSubmittedAt: new Date("2024-01-01T00:00:00.000Z"),
    hintHistory: [],
    board: [
      { word: "river", color: "blue", revealed: false },
      { word: "apple", color: "red", revealed: false },
      { word: "mountain", color: "blue", revealed: false },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
  };

  gameRepository.findById = async () => game as any;
  RoomModel.findOne = () => ({ exec: async () => room }) as any;
  gameRepository.update = async (_gameId, updates) => {
    Object.assign(game, updates);
    return game as any;
  };

  registerRoomSocketHandlers(io, socket);

  const selectHandler = handlers.get("game:select");
  if (!selectHandler) {
    throw new Error("game:select handler was not registered.");
  }

  await selectHandler({
    gameId: "game-id",
    roomCode: "abc123",
    telegramId: 10,
    cardId: "0",
    confirm: false,
  });

  assert.equal(game.selectedCardId, "0");
  assert.equal(
    emitted.some((event) => event.event === "game:selected"),
    false,
  );

  await selectHandler({
    gameId: "game-id",
    roomCode: "abc123",
    telegramId: 10,
    cardId: "0",
    confirm: true,
  });

  assert.equal(game.board[0]?.revealed, true);
  assert.equal(game.board[0]?.color, "blue");
  assert.equal(game.remainingGuesses, 1);
  assert.equal(game.currentTurn, "blue");
  assert.equal(game.selectedCardId, null);

  const stateEvents = emitted.filter((event) => event.event === "game:state");
  assert.equal(stateEvents.length, 2);
  const latestState = stateEvents[stateEvents.length - 1]?.payload as {
    game: {
      blueCardsRemaining: number;
      redCardsRemaining: number;
      remainingGuesses: number;
    };
  };
  assert.equal(latestState.game.blueCardsRemaining, 1);
  assert.equal(latestState.game.redCardsRemaining, 1);
  assert.equal(latestState.game.remainingGuesses, 1);

  assert.equal(
    emitted.some((event) => event.event === "game:revealed"),
    false,
  );

  gameRepository.findById = originalFindById;
  gameRepository.update = originalUpdate;
  RoomModel.findOne = originalRoomFindOne;
});

test("registerRoomSocketHandlers accepts an owner rematch request and initializes a new game", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindByRoomId = gameRepository.findByRoomId;
  const originalCreate = gameRepository.create;
  const originalDeleteOne = GameModel.deleteOne;
  const originalRoomFindOne = RoomModel.findOne;
  const originalWordPoolFindOne = WordPoolModel.findOne;

  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
    data: { telegramId: 10 },
    join: async () => undefined,
    leave: async () => undefined,
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    on: (event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    },
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[1];

  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ event, payload });
      },
    }),
  } as unknown as Parameters<typeof registerRoomSocketHandlers>[0];

  const room = createRoomDocument({
    roomCode: "ABC123",
    ownerId: 10,
    ownerIds: [10],
    players: [
      {
        userId: "owner-id",
        telegramId: 10,
        displayName: "Owner",
        team: "red",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  });

  const game = {
    _id: "game-id",
    roomId: "room-id",
    status: "finished",
    currentTurn: "red",
    startingTeam: "red",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    board: [
      { word: "apple", color: "red", revealed: true },
      { word: "banana", color: "blue", revealed: false },
    ],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: "red",
    completionReason: "all-red-cards-revealed",
    completedAt: new Date("2024-01-01T00:00:00.000Z"),
  } as any;

  const newGame = {
    ...game,
    _id: "new-game-id",
    status: "active",
    currentTurn: "blue",
    startingTeam: "blue",
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    board: [
      { word: "cloud", color: "blue", revealed: false },
      { word: "stone", color: "red", revealed: false },
    ],
    winningTeam: null,
    completionReason: null,
    completedAt: null,
  } as any;

  let findByRoomIdCallCount = 0;
  roomRepository.findByCode = async () => room as any;
  gameRepository.findByRoomId = async () => {
    findByRoomIdCallCount += 1;
    return findByRoomIdCallCount === 1 ? (game as any) : undefined;
  };
  RoomModel.findOne = () => ({ exec: async () => room }) as any;
  WordPoolModel.findOne = () =>
    ({ lean: () => ({ exec: async () => null }) }) as any;
  GameModel.deleteOne = () => ({ exec: async () => ({}) }) as any;
  gameRepository.create = async () => newGame as any;

  registerRoomSocketHandlers(io, socket);

  const rematchHandler = handlers.get("room:rematch");
  if (!rematchHandler) {
    throw new Error("room:rematch handler was not registered.");
  }

  await rematchHandler({
    roomCode: "abc123",
    ownerTelegramId: 10,
  });

  assert.ok(emitted.some((event) => event.event === "game:initialized"));
  const initializedEvent = emitted.find(
    (event) => event.event === "game:initialized",
  );
  assert.ok(initializedEvent);
  assert.deepEqual(
    (initializedEvent?.payload as { status: string }).status,
    "active",
  );
  assert.equal(
    (initializedEvent?.payload as { gameId: string }).gameId,
    "new-game-id",
  );

  roomRepository.findByCode = originalFindByCode;
  gameRepository.findByRoomId = originalFindByRoomId;
  RoomModel.findOne = originalRoomFindOne;
  WordPoolModel.findOne = originalWordPoolFindOne;
  gameRepository.create = originalCreate;
  GameModel.deleteOne = originalDeleteOne;
});
