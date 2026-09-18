import type { Server as SocketIOServer, Socket } from "socket.io";

import { env } from "../config/env.js";
import { GameModel } from "../models/game.model.js";
import { RoomModel } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { roomRepository } from "../repositories/room.repository.js";
import {
  joinRoom,
  updateRoomPlayerAssignment,
} from "../services/room.service.js";
import {
  chooseBotRole,
  chooseBotTeam,
  generateBotTelegramId,
} from "./room.socket.helpers.js";
import type { Room } from "../../../shared/src/types/room.js";
import type {
  GameDebugRevealPayload,
  RoomResetPayload,
} from "../../../shared/src/types/socket.js";

interface AddBotSocketPayload {
  roomCode?: unknown;
  botName?: unknown;
}

interface PopulateBotsSocketPayload {
  roomCode?: unknown;
  count?: unknown;
}

type ResetRoomSocketPayload = RoomResetPayload;
type DebugRevealSocketPayload = GameDebugRevealPayload;

export function registerDevelopmentSocketHandlers(
  io: SocketIOServer,
  socket: Socket,
): void {
  socket.on("room:addBot", async (payload: AddBotSocketPayload) => {
    try {
      if (!env.DEV_MODE) {
        socket.emit("room:error", {
          message: "Bot spawning is available only in dev mode.",
        });
        return;
      }

      if (typeof payload.roomCode !== "string") {
        socket.emit("room:error", { message: "Invalid bot spawn payload." });
        return;
      }

      const botName =
        typeof payload.botName === "string" && payload.botName.trim()
          ? payload.botName.trim()
          : `Bot ${Math.floor(Math.random() * 900) + 100}`;
      const telegramId = generateBotTelegramId(botName);

      const room = await joinRoom({
        roomCode: payload.roomCode,
        telegramId,
        displayName: botName,
      });

      const team = chooseBotTeam(room);
      const role = chooseBotRole(room, team);
      const updatedRoom = await updateRoomPlayerAssignment({
        roomCode: room.roomCode,
        telegramId,
        team,
        role,
      });

      await socket.join(updatedRoom.roomCode);
      io.to(updatedRoom.roomCode).emit("room:updated", updatedRoom);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bot spawn failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:populateBots", async (payload: PopulateBotsSocketPayload) => {
    try {
      if (!env.DEV_MODE && socket.data?.devMode !== true) {
        socket.emit("room:error", {
          message: "Bot population is available only in dev mode.",
        });
        return;
      }

      if (typeof payload.roomCode !== "string") {
        socket.emit("room:error", {
          message: "Invalid bot population payload.",
        });
        return;
      }

      const requestedCount =
        typeof payload.count === "number" && Number.isInteger(payload.count)
          ? payload.count
          : 5;
      const targetCount = Math.max(1, Math.min(requestedCount, 5));
      const initialRoom = await roomRepository.findByCode(payload.roomCode);
      if (!initialRoom) {
        socket.emit("room:error", { message: "Room not found." });
        return;
      }
      const roomCode = initialRoom.roomCode;
      let populatedRoom = initialRoom.toObject() as unknown as Room;

      const existingBotCount = populatedRoom.players.filter((player) =>
        player.displayName.startsWith("Dev Player "),
      ).length;

      for (let index = existingBotCount; index < targetCount; index += 1) {
        const botName = `Dev Player ${index + 1}`;
        const joinedRoom = await joinRoom({
          roomCode,
          telegramId: generateBotTelegramId(botName),
          displayName: botName,
        });
        const bot = joinedRoom.players.find(
          (player) => player.displayName === botName,
        );
        if (!bot) {
          throw new Error("Bot was not added to the room.");
        }

        const team = chooseBotTeam(joinedRoom);
        const role = chooseBotRole(joinedRoom, team);
        populatedRoom = await updateRoomPlayerAssignment({
          roomCode: joinedRoom.roomCode,
          telegramId: bot.telegramId,
          team,
          role,
        });
      }

      await socket.join(roomCode);
      io.to(roomCode).emit("room:updated", populatedRoom);
      socket.emit("room:devPopulated", {
        roomCode,
        playerCount: populatedRoom.players.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bot population failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:reset", async (payload: ResetRoomSocketPayload) => {
    try {
      if (!env.DEV_MODE) {
        socket.emit("room:error", {
          message: "Room reset is available only in dev mode.",
        });
        return;
      }

      if (typeof payload.roomCode !== "string") {
        socket.emit("room:error", { message: "Invalid room reset payload." });
        return;
      }

      const normalizedRoomCode = payload.roomCode.toUpperCase();
      const room = await RoomModel.findOne({
        roomCode: normalizedRoomCode,
      }).exec();
      if (!room) {
        socket.emit("room:error", { message: "Room not found." });
        return;
      }

      const game = await gameRepository.findByRoomId(room._id.toString());
      if (game) {
        await GameModel.deleteOne({ _id: game._id }).exec();
      }

      room.status = "waiting";
      const updatedRoom = await room.save();

      io.to(normalizedRoomCode).emit("room:reset", {
        roomCode: normalizedRoomCode,
      });
      io.to(normalizedRoomCode).emit("room:updated", updatedRoom);
      io.to(normalizedRoomCode).emit("game:reset", {
        roomCode: normalizedRoomCode,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room reset failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("game:debugReveal", async (payload: DebugRevealSocketPayload) => {
    try {
      if (!env.DEV_MODE) {
        socket.emit("game:error", {
          message: "Debug reveal is available only in dev mode.",
        });
        return;
      }

      if (typeof payload.roomCode !== "string") {
        socket.emit("game:error", { message: "Invalid reveal payload." });
        return;
      }

      const normalizedRoomCode = payload.roomCode.toUpperCase();
      const room = await RoomModel.findOne({
        roomCode: normalizedRoomCode,
      }).exec();
      if (!room) {
        socket.emit("game:error", { message: "Room not found." });
        return;
      }

      const game = await gameRepository.findByRoomId(room._id.toString());
      if (!game) {
        socket.emit("game:error", { message: "Game not found." });
        return;
      }

      io.to(normalizedRoomCode).emit("game:keycard", {
        gameId: game._id.toString(),
        board: game.board.map((card) => ({
          word: card.word,
          color: card.color ?? "neutral",
          revealed: card.revealed,
        })),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reveal keycard.";
      socket.emit("game:error", { message });
    }
  });
}
