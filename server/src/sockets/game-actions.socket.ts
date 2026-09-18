import type { Server as SocketIOServer, Socket } from "socket.io";

import { RoomModel } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { submitHint } from "../services/game-command.service.js";
import { applyTurnPass } from "../services/turn.service.js";
import { validateGameplayAction } from "../services/win-condition.service.js";
import {
  getActorTelegramId,
  gameBelongsToRoom,
  hasTurnTimerExpired,
} from "./room.socket.helpers.js";
import type { Room } from "../../../shared/src/types/room.js";
import type {
  GameHintInputPayload,
  GamePassInputPayload,
} from "../../../shared/src/types/socket.js";

type GameActionAcknowledgement = (error?: { message: string }) => void;
type EmitGameState = (
  io: SocketIOServer,
  roomCode: string,
  room: Room,
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
) => Promise<void>;

export function registerGameActionSocketHandlers(
  io: SocketIOServer,
  socket: Socket,
  emitGameState: EmitGameState,
): void {
  socket.on(
    "game:hint",
    async (
      payload: GameHintInputPayload,
      acknowledge?: GameActionAcknowledgement,
    ) => {
      try {
        if (
          typeof payload.gameId !== "string" ||
          typeof payload.roomCode !== "string" ||
          typeof payload.telegramId !== "number" ||
          typeof payload.word !== "string" ||
          typeof payload.number !== "number"
        ) {
          socket.emit("game:error", { message: "Invalid hint payload." });
          acknowledge?.({ message: "Invalid hint payload." });
          return;
        }

        const actorTelegramId = getActorTelegramId(socket, payload.telegramId);
        const result = await submitHint({
          gameId: payload.gameId,
          roomCode: payload.roomCode,
          telegramId: actorTelegramId,
          word: payload.word,
          number: payload.number,
        });

        await emitGameState(
          io,
          payload.roomCode.toUpperCase(),
          result.room as unknown as Room,
          result.game,
        );
        acknowledge?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to submit hint.";
        socket.emit("game:error", { message });
        acknowledge?.({ message });
      }
    },
  );

  socket.on(
    "game:pass",
    async (
      payload: GamePassInputPayload,
      acknowledge?: GameActionAcknowledgement,
    ) => {
      try {
        if (
          typeof payload.gameId !== "string" ||
          typeof payload.roomCode !== "string" ||
          typeof payload.telegramId !== "number"
        ) {
          socket.emit("game:error", { message: "Invalid pass payload." });
          acknowledge?.({ message: "Invalid pass payload." });
          return;
        }

        const actorTelegramId = getActorTelegramId(socket, payload.telegramId);
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

        const timeoutRequested = payload.timeout === true;
        const timeoutAllowed =
          timeoutRequested && hasTurnTimerExpired(game, room);
        if (timeoutRequested && !timeoutAllowed) {
          socket.emit("game:error", {
            message: "The turn timer has not expired.",
          });
          return;
        }

        const validation = validateGameplayAction({
          game: {
            status: game.status,
            currentTurn: game.currentTurn,
            startingTeam: game.startingTeam,
            remainingGuesses: game.remainingGuesses,
            currentHintWord: game.currentHintWord ?? null,
            currentHintNumber: game.currentHintNumber ?? null,
            hintSubmittedAt: game.hintSubmittedAt ?? null,
            board: game.board,
            selectedCardId: game.selectedCardId ?? null,
            selectedByPlayerId: game.selectedByPlayerId ?? null,
            selectedAt: game.selectedAt ?? null,
            winningTeam: game.winningTeam ?? null,
            completionReason: game.completionReason ?? null,
            completedAt: game.completedAt ?? null,
          },
        });
        if (!validation.ok) {
          socket.emit("game:error", { message: validation.error });
          return;
        }

        const result = applyTurnPass({
          game: {
            status: game.status,
            currentTurn: game.currentTurn,
            remainingGuesses: game.remainingGuesses,
            currentHintWord: game.currentHintWord ?? null,
            currentHintNumber: game.currentHintNumber ?? null,
            hintSubmittedAt: game.hintSubmittedAt ?? null,
            board: game.board,
            selectedCardId: game.selectedCardId ?? null,
            selectedByPlayerId: game.selectedByPlayerId ?? null,
            selectedAt: game.selectedAt ?? null,
          },
          room: { players: room.players },
          senderTelegramId: actorTelegramId,
          allowTimeout: timeoutAllowed,
        });

        const existingRounds = game.rounds ?? [];
        const currentRound = existingRounds[existingRounds.length - 1];
        const rounds =
          !timeoutAllowed && currentRound?.team === game.currentTurn
            ? existingRounds.map((round, index) =>
                index === existingRounds.length - 1
                  ? {
                      ...round,
                      passes: [
                        ...(round.passes ?? []),
                        {
                          playerId:
                            room.players.find(
                              (player) => player.telegramId === actorTelegramId,
                            )?.userId ?? null,
                          passedAt: new Date(),
                        },
                      ],
                    }
                  : round,
              )
            : existingRounds;

        const updatedGame = await gameRepository.update(
          payload.gameId,
          {
            currentTurn: result.game.currentTurn,
            remainingGuesses: result.game.remainingGuesses,
            currentHintWord: result.game.currentHintWord,
            currentHintNumber: result.game.currentHintNumber,
            hintSubmittedAt: result.game.hintSubmittedAt,
            selectedCardId: result.game.selectedCardId,
            selectedByPlayerId: result.game.selectedByPlayerId,
            selectedAt: result.game.selectedAt,
            rounds,
            phase: "spymaster",
            phaseStartedAt: new Date(),
            turnStartedAt: new Date(),
          },
          game.updatedAt,
        );
        if (!updatedGame) {
          socket.emit("game:error", { message: "Unable to pass turn." });
          return;
        }

        await emitGameState(
          io,
          payload.roomCode.toUpperCase(),
          room as unknown as Room,
          updatedGame,
        );
        acknowledge?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to pass turn.";
        socket.emit("game:error", { message });
        acknowledge?.({ message });
      }
    },
  );
}
