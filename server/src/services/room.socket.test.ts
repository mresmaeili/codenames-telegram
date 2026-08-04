import assert from "node:assert/strict";
import test from "node:test";

import { registerRoomSocketHandlers } from "../sockets/room.socket.js";
import { createRoomDocument } from "../test-utils/test-helpers.js";
import { roomRepository } from "../repositories/room.repository.js";
import { UserModel } from "../models/user.model.js";

test("registerRoomSocketHandlers handles duplicate room joins without crashing", async () => {
  const originalFindByCode = roomRepository.findByCode;
  const originalFindOne = (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne;
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();

  const socket = {
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

  assert.ok(emitted.some((event) => event.event === "room:joined"));

  roomRepository.findByCode = originalFindByCode;
  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = originalFindOne;
});
