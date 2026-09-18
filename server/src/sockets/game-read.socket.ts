import type { Server as SocketIOServer, Socket } from "socket.io";

import { RoomModel } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { getActorTelegramId } from "./room.socket.helpers.js";
import type { Room } from "../../../shared/src/types/room.js";

interface GameReadPayload {
  roomCode?: unknown;
  telegramId?: unknown;
}

interface KeycardRequestPayload {
  roomCode?: unknown;
  requesterTelegramId?: unknown;
}

type EmitGameStateToSocket = (
  socket: Socket,
  room: Room,
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
  telegramId: number,
) => void;

export function registerGameReadSocketHandlers(
  io: SocketIOServer,
  socket: Socket,
  emitGameStateToSocket: EmitGameStateToSocket,
): void {
  void io;

  socket.on("game:sync", async (payload: GameReadPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number"
      ) {
        socket.emit("game:error", { message: "Invalid sync payload." });
        return;
      }

      const telegramId = getActorTelegramId(socket, payload.telegramId);
      const room = await RoomModel.findOne({
        roomCode: payload.roomCode.toUpperCase(),
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

      emitGameStateToSocket(socket, room as unknown as Room, game, telegramId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sync game.";
      socket.emit("game:error", { message });
    }
  });

  socket.on("game:requestKeycard", async (payload: KeycardRequestPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.requesterTelegramId !== "number"
      ) {
        socket.emit("game:error", { message: "Invalid request payload." });
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

      const requesterTelegramId = getActorTelegramId(
        socket,
        payload.requesterTelegramId,
      );
      const requester = room.players.find(
        (player) => player.telegramId === requesterTelegramId,
      );
      if (!requester || requester.role !== "spymaster") {
        socket.emit("game:error", {
          message: "Not authorized to view keycard.",
        });
        return;
      }

      const game = await gameRepository.findByRoomId(room._id.toString());
      if (!game) {
        socket.emit("game:error", { message: "Game not found." });
        return;
      }

      socket.emit("game:keycard", {
        gameId: game._id.toString(),
        board: game.board.map((card) => ({
          word: card.word,
          color: card.color ?? "neutral",
          revealed: card.revealed,
        })),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to fetch keycard.";
      socket.emit("game:error", { message });
    }
  });
}
