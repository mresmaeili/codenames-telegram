import type { Server as SocketIOServer, Socket } from "socket.io";

import { RoomModel } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { revealCard, selectCard } from "../services/game-command.service.js";
import {
  gameBelongsToRoom,
  getActorTelegramId,
} from "./room.socket.helpers.js";
import type { Room } from "../../../shared/src/types/room.js";
import type { GameSelectInputPayload } from "../../../shared/src/types/socket.js";

type GameActionAcknowledgement = (error?: { message: string }) => void;
type EmitGameState = (
  io: SocketIOServer,
  roomCode: string,
  room: Room,
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
) => Promise<void>;

export function registerGameSelectSocketHandler(
  io: SocketIOServer,
  socket: Socket,
  emitGameState: EmitGameState,
): void {
  socket.on(
    "game:select",
    async (
      payload: GameSelectInputPayload,
      acknowledge?: GameActionAcknowledgement,
    ) => {
      try {
        if (
          typeof payload.gameId !== "string" ||
          typeof payload.roomCode !== "string" ||
          typeof payload.telegramId !== "number" ||
          typeof payload.cardId !== "string"
        ) {
          socket.emit("game:error", { message: "Invalid selection payload." });
          return;
        }

        const game = await gameRepository.findById(payload.gameId);
        if (!game) {
          socket.emit("game:error", { message: "Game not found." });
          return;
        }

        const room = await RoomModel.findOne({
          roomCode: payload.roomCode.toUpperCase(),
        }).exec();
        if (!room) {
          socket.emit("game:error", { message: "Room not found." });
          return;
        }
        if (!gameBelongsToRoom(game, room)) {
          socket.emit("game:error", {
            message: "Game does not belong to this room.",
          });
          return;
        }

        const actorTelegramId = getActorTelegramId(socket, payload.telegramId);
        if (payload.confirm === true) {
          const result = await revealCard({
            gameId: payload.gameId,
            roomCode: payload.roomCode,
            telegramId: actorTelegramId,
            cardId: payload.cardId,
          });
          await emitGameState(
            io,
            payload.roomCode.toUpperCase(),
            result.room as unknown as Room,
            result.game,
          );
          acknowledge?.();
          return;
        }

        if (payload.confirm === false) {
          const selectedResult = await selectCard({
            gameId: payload.gameId,
            roomCode: payload.roomCode,
            telegramId: actorTelegramId,
            cardId: payload.cardId,
          });
          const selectedPlayerId = room.players.find(
            (player) => player.telegramId === actorTelegramId,
          )?.userId;
          await emitGameState(
            io,
            payload.roomCode.toUpperCase(),
            selectedResult.room as unknown as Room,
            selectedResult.game,
          );
          if (selectedPlayerId) {
            io.to(payload.roomCode.toUpperCase()).emit("game:selection", {
              gameId: payload.gameId,
              stateVersion: selectedResult.game.stateVersion ?? 0,
              cardId: payload.cardId,
              playerId: selectedPlayerId,
              selected: (selectedResult.game.pendingSelections ?? []).some(
                (selection) =>
                  selection.cardId === payload.cardId &&
                  selection.playerId === selectedPlayerId,
              ),
            });
          }
          acknowledge?.();
          return;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to select card.";
        acknowledge?.({ message });
        socket.emit("game:error", { message });
      }
    },
  );
}
