import type { Server as SocketIOServer, Socket } from "socket.io";

import { leaveRoom } from "../services/lobby.service.js";
import {
  createRoom,
  joinRoom,
  resetRoomTeams,
  shuffleRoomTeams,
  startRoom,
  transferRoomOwnership,
  updateRoomPlayerAssignment,
  updateRoomSettings,
} from "../services/room.service.js";
import { createGame } from "../services/game.service.js";
import { applyHintSubmission } from "../services/hint.service.js";
import { applyCardSelection } from "../services/selection.service.js";
import { applyCardReveal } from "../services/reveal.service.js";
import { applyTurnPass, applyTurnOutcome } from "../services/turn.service.js";
import {
  applyGameCompletion,
  validateGameplayAction,
} from "../services/win-condition.service.js";
import { gameRepository } from "../repositories/game.repository.js";
import { roomRepository } from "../repositories/room.repository.js";
import { GameModel } from "../models/game.model.js";
import { RoomModel } from "../models/room.model.js";
import { env } from "../config/env.js";
interface CreateRoomSocketPayload {
  ownerId?: unknown;
  ownerTelegramId?: unknown;
  ownerDisplayName?: unknown;
}

interface JoinRoomSocketPayload {
  roomCode?: unknown;
  telegramId?: unknown;
  displayName?: unknown;
}

interface UpdateTeamSocketPayload {
  roomCode?: unknown;
  telegramId?: unknown;
  team?: unknown;
  role?: unknown;
}

interface UpdateRoomSettingsSocketPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
  settings?: unknown;
}

interface StartRoomSocketPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
}

interface TransferHostSocketPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
  targetTelegramId?: unknown;
}

interface ShuffleRoomTeamsSocketPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
}

interface ResetRoomTeamsSocketPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
}

interface LeaveRoomSocketPayload {
  roomCode?: unknown;
  userId?: unknown;
}

interface HintSocketPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
  word?: unknown;
  number?: unknown;
}

interface SelectionSocketPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
  cardId?: unknown;
}

interface PassSocketPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
}

interface AddBotSocketPayload {
  roomCode?: unknown;
  botName?: unknown;
}

interface ResetRoomSocketPayload {
  roomCode?: unknown;
}

interface DebugRevealSocketPayload {
  roomCode?: unknown;
}

function generateBotTelegramId(botName: string): number {
  let hash = 0;
  for (let index = 0; index < botName.length; index += 1) {
    hash = (hash << 5) - hash + botName.charCodeAt(index);
    hash |= 0;
  }

  const normalized = Math.abs(hash) % 900000000;
  return normalized + 100000000;
}

function chooseBotTeam(room: { players: Array<{ team: string | null }> }) {
  const redPlayers = room.players.filter((player) => player.team === "red");
  const bluePlayers = room.players.filter((player) => player.team === "blue");

  if (redPlayers.length === bluePlayers.length) {
    return Math.random() < 0.5 ? "red" : "blue";
  }

  return redPlayers.length < bluePlayers.length ? "red" : "blue";
}

function chooseBotRole(
  room: { players: Array<{ team: string | null; role: string }> },
  team: string,
) {
  const hasTeamSpymaster = room.players.some(
    (player) => player.team === team && player.role === "spymaster",
  );

  return hasTeamSpymaster ? "operative" : "spymaster";
}

export function registerRoomSocketHandlers(
  io: SocketIOServer,
  socket: Socket,
): void {
  socket.on("room:create", async (payload: CreateRoomSocketPayload) => {
    try {
      if (
        typeof payload.ownerId !== "string" ||
        typeof payload.ownerTelegramId !== "number" ||
        typeof payload.ownerDisplayName !== "string"
      ) {
        socket.emit("error", { message: "Invalid room creation payload." });
        return;
      }

      const room = await createRoom({
        ownerId: payload.ownerId,
        ownerTelegramId: payload.ownerTelegramId,
        ownerDisplayName: payload.ownerDisplayName,
      });

      await socket.join(room.roomCode);
      socket.emit("room:created", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room creation failed.";
      socket.emit("error", { message });
    }
  });

  socket.on("room:join", async (payload: JoinRoomSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number" ||
        typeof payload.displayName !== "string"
      ) {
        socket.emit("room:error", { message: "Invalid room join payload." });
        return;
      }

      const room = await joinRoom({
        roomCode: payload.roomCode,
        telegramId: payload.telegramId,
        displayName: payload.displayName,
      });

      await socket.join(room.roomCode);
      socket.emit("room:joined", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room join failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:updateTeam", async (payload: UpdateTeamSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number" ||
        !(typeof payload.team === "string" || payload.team === null) ||
        typeof payload.role !== "string"
      ) {
        socket.emit("room:error", {
          message: "Invalid room assignment payload.",
        });
        return;
      }

      const room = await updateRoomPlayerAssignment({
        roomCode: payload.roomCode,
        telegramId: payload.telegramId,
        team: payload.team,
        role: payload.role,
      });

      socket.emit("room:updated", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Team assignment failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on(
    "room:transferOwner",
    async (payload: TransferHostSocketPayload) => {
      try {
        if (
          typeof payload.roomCode !== "string" ||
          typeof payload.ownerTelegramId !== "number" ||
          typeof payload.targetTelegramId !== "number"
        ) {
          socket.emit("room:error", {
            message: "Invalid host transfer payload.",
          });
          return;
        }

        const room = await transferRoomOwnership({
          roomCode: payload.roomCode,
          ownerTelegramId: payload.ownerTelegramId,
          targetTelegramId: payload.targetTelegramId,
        });

        socket.emit("room:updated", room);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Host transfer failed.";
        socket.emit("room:error", { message });
      }
    },
  );

  socket.on(
    "room:shuffleTeams",
    async (payload: ShuffleRoomTeamsSocketPayload) => {
      try {
        if (
          typeof payload.roomCode !== "string" ||
          typeof payload.ownerTelegramId !== "number"
        ) {
          socket.emit("room:error", {
            message: "Invalid room team shuffle payload.",
          });
          return;
        }

        const room = await shuffleRoomTeams({
          roomCode: payload.roomCode,
          ownerTelegramId: payload.ownerTelegramId,
        });

        socket.emit("room:updated", room);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Team shuffle failed.";
        socket.emit("room:error", { message });
      }
    },
  );

  socket.on("room:resetTeams", async (payload: ResetRoomTeamsSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.ownerTelegramId !== "number"
      ) {
        socket.emit("room:error", {
          message: "Invalid room team reset payload.",
        });
        return;
      }

      const room = await resetRoomTeams({
        roomCode: payload.roomCode,
        ownerTelegramId: payload.ownerTelegramId,
      });

      socket.emit("room:updated", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Team reset failed.";
      socket.emit("room:error", { message });
    }
  });

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
      socket.emit("room:botAdded", {
        room: updatedRoom,
        botName,
        telegramId,
      });
      io.to(updatedRoom.roomCode).emit("room:updated", updatedRoom);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bot spawn failed.";
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

  socket.on(
    "game:requestKeycard",
    async (payload: { roomCode?: unknown; requesterTelegramId?: unknown }) => {
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

        const requester = room.players.find(
          (p) => p.telegramId === payload.requesterTelegramId,
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
    },
  );

  socket.on(
    "room:updateSettings",
    async (payload: UpdateRoomSettingsSocketPayload) => {
      try {
        if (
          typeof payload.roomCode !== "string" ||
          typeof payload.ownerTelegramId !== "number" ||
          typeof payload.settings !== "object" ||
          payload.settings === null
        ) {
          socket.emit("room:error", {
            message: "Invalid room settings payload.",
          });
          return;
        }

        const settingsPayload = payload.settings as {
          maxPlayers?: unknown;
          allowSpectators?: unknown;
          privateRoom?: unknown;
          gameMode?: unknown;
          timer?: unknown;
          language?: unknown;
          wordPack?: unknown;
        };

        if (
          typeof settingsPayload.maxPlayers !== "number" ||
          typeof settingsPayload.allowSpectators !== "boolean" ||
          typeof settingsPayload.privateRoom !== "boolean" ||
          typeof settingsPayload.gameMode !== "string" ||
          typeof settingsPayload.timer !== "string" ||
          typeof settingsPayload.language !== "string" ||
          typeof settingsPayload.wordPack !== "string"
        ) {
          socket.emit("room:error", {
            message: "Invalid room settings payload.",
          });
          return;
        }

        const room = await updateRoomSettings({
          roomCode: payload.roomCode,
          ownerTelegramId: payload.ownerTelegramId,
          settings: {
            maxPlayers: settingsPayload.maxPlayers,
            allowSpectators: settingsPayload.allowSpectators,
            privateRoom: settingsPayload.privateRoom,
            gameMode: settingsPayload.gameMode as "standard" | "rush",
            timer: settingsPayload.timer as "none" | "30" | "60" | "90",
            language: settingsPayload.language as "en" | "es" | "he",
            wordPack: settingsPayload.wordPack as "classic" | "party",
          },
        });

        socket.emit("room:updated", room);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Room settings update failed.";
        socket.emit("room:error", { message });
      }
    },
  );

  socket.on("room:start", async (payload: StartRoomSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.ownerTelegramId !== "number"
      ) {
        socket.emit("room:error", { message: "Invalid room start payload." });
        return;
      }

      const room = await startRoom({
        roomCode: payload.roomCode,
        ownerTelegramId: payload.ownerTelegramId,
      });

      const { game } = await createGame({ roomCode: payload.roomCode });
      socket.emit("room:starting", room);
      io.to(room.roomCode).emit("room:updated", room);
      socket.emit("game:initialized", {
        gameId: game._id.toString(),
        roomCode: room.roomCode,
        status: game.status,
        startingTeam: game.startingTeam,
        currentTurn: game.currentTurn,
        remainingGuesses: game.remainingGuesses,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room start failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:rematch", async (payload: StartRoomSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.ownerTelegramId !== "number"
      ) {
        socket.emit("room:error", { message: "Invalid room rematch payload." });
        return;
      }

      const normalizedRoomCode = payload.roomCode.toUpperCase();
      const room = await roomRepository.findByCode(normalizedRoomCode);
      if (!room) {
        socket.emit("room:error", { message: "Room not found." });
        return;
      }

      const owner = room.players.find(
        (player) =>
          player.telegramId === payload.ownerTelegramId &&
          room.ownerIds.includes(player.userId),
      );
      if (!owner) {
        socket.emit("room:error", {
          message: "Only the room owner can request a rematch.",
        });
        return;
      }

      const existingGame = await gameRepository.findByRoomId(
        room._id.toString(),
      );
      if (existingGame) {
        await GameModel.deleteOne({ _id: existingGame._id }).exec();
      }

      const { game: newGame } = await createGame({
        roomCode: payload.roomCode,
      });
      socket.emit("room:starting", room);
      io.to(room.roomCode).emit("room:updated", room);
      socket.emit("game:initialized", {
        gameId: newGame._id.toString(),
        roomCode: room.roomCode,
        status: newGame.status,
        startingTeam: newGame.startingTeam,
        currentTurn: newGame.currentTurn,
        remainingGuesses: newGame.remainingGuesses,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room rematch failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:leave", async (payload: LeaveRoomSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.userId !== "string"
      ) {
        socket.emit("room:error", { message: "Invalid room leave payload." });
        return;
      }

      const room = await leaveRoom({
        roomCode: payload.roomCode,
        userId: payload.userId,
      });

      if (room) {
        await socket.leave(payload.roomCode.toUpperCase());
        io.to(payload.roomCode.toUpperCase()).emit("room:updated", room);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room leave failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("game:hint", async (payload: HintSocketPayload) => {
    try {
      if (
        typeof payload.gameId !== "string" ||
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number" ||
        typeof payload.word !== "string" ||
        typeof payload.number !== "number"
      ) {
        socket.emit("game:error", { message: "Invalid hint payload." });
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

      const result = applyHintSubmission({
        game: {
          status: game.status,
          currentTurn: game.currentTurn,
          remainingGuesses: game.remainingGuesses,
          currentHintWord: game.currentHintWord ?? null,
          currentHintNumber: game.currentHintNumber ?? null,
          hintSubmittedAt: game.hintSubmittedAt ?? null,
          hintHistory: game.hintHistory ?? [],
        },
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
        word: payload.word,
        number: payload.number,
      });

      const updatedGame = await gameRepository.update(payload.gameId, {
        currentHintWord: result.game.currentHintWord,
        currentHintNumber: result.game.currentHintNumber,
        remainingGuesses: result.game.remainingGuesses,
        hintSubmittedAt: result.game.hintSubmittedAt,
        hintHistory: result.game.hintHistory,
      });

      if (!updatedGame) {
        socket.emit("game:error", { message: "Unable to update game hint." });
        return;
      }

      io.to(payload.roomCode.toUpperCase()).emit("game:hinted", {
        gameId: updatedGame._id.toString(),
        currentHintWord: updatedGame.currentHintWord,
        currentHintNumber: updatedGame.currentHintNumber,
        remainingGuesses: updatedGame.remainingGuesses,
        hintSubmittedAt: updatedGame.hintSubmittedAt,
        hintHistory: updatedGame.hintHistory,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit hint.";
      socket.emit("game:error", { message });
    }
  });

  socket.on("game:select", async (payload: SelectionSocketPayload) => {
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

      const selectionResult = applyCardSelection({
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
        senderTelegramId: payload.telegramId,
        cardId: payload.cardId,
      });

      const revealResult = applyCardReveal({
        game: selectionResult.game,
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
      });

      const selectedCardColor =
        selectionResult.game.board[Number.parseInt(payload.cardId, 10)]
          ?.color ?? null;

      const turnResult = applyTurnOutcome({
        game: revealResult.game,
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
        revealedCardColor: selectedCardColor,
      });

      const completionResult = applyGameCompletion({
        game: {
          ...turnResult.game,
          status: turnResult.game.status,
          startingTeam: game.startingTeam,
          winningTeam: game.winningTeam ?? null,
          completionReason: game.completionReason ?? null,
          completedAt: game.completedAt ?? null,
        },
      });

      const updatedGame = await gameRepository.update(payload.gameId, {
        board: revealResult.game.board,
        status: completionResult.game.status,
        currentTurn: completionResult.game.currentTurn,
        remainingGuesses: completionResult.game.remainingGuesses,
        currentHintWord: completionResult.game.currentHintWord,
        currentHintNumber: completionResult.game.currentHintNumber,
        hintSubmittedAt: completionResult.game.hintSubmittedAt,
        selectedCardId: completionResult.game.selectedCardId,
        selectedByPlayerId: completionResult.game.selectedByPlayerId,
        selectedAt: completionResult.game.selectedAt,
        winningTeam: completionResult.game.winningTeam,
        completionReason: completionResult.game.completionReason,
        completedAt: completionResult.game.completedAt,
      });

      if (!updatedGame) {
        socket.emit("game:error", { message: "Unable to reveal card." });
        return;
      }

      io.to(payload.roomCode.toUpperCase()).emit("game:revealed", {
        gameId: updatedGame._id.toString(),
        board: updatedGame.board,
        currentTurn: updatedGame.currentTurn,
        remainingGuesses: updatedGame.remainingGuesses,
        currentHintWord: updatedGame.currentHintWord,
        currentHintNumber: updatedGame.currentHintNumber,
        status: updatedGame.status,
        selectedCardId: updatedGame.selectedCardId,
        selectedByPlayerId: updatedGame.selectedByPlayerId,
        selectedAt: updatedGame.selectedAt,
        winningTeam: updatedGame.winningTeam,
        completionReason: updatedGame.completionReason,
        completedAt: updatedGame.completedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to select card.";
      socket.emit("game:error", { message });
    }
  });

  socket.on("game:pass", async (payload: PassSocketPayload) => {
    try {
      if (
        typeof payload.gameId !== "string" ||
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number"
      ) {
        socket.emit("game:error", { message: "Invalid pass payload." });
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
        senderTelegramId: payload.telegramId,
      });

      const updatedGame = await gameRepository.update(payload.gameId, {
        currentTurn: result.game.currentTurn,
        remainingGuesses: result.game.remainingGuesses,
        currentHintWord: result.game.currentHintWord,
        currentHintNumber: result.game.currentHintNumber,
        hintSubmittedAt: result.game.hintSubmittedAt,
        selectedCardId: result.game.selectedCardId,
        selectedByPlayerId: result.game.selectedByPlayerId,
        selectedAt: result.game.selectedAt,
      });

      if (!updatedGame) {
        socket.emit("game:error", { message: "Unable to pass turn." });
        return;
      }

      io.to(payload.roomCode.toUpperCase()).emit("game:passed", {
        gameId: updatedGame._id.toString(),
        currentTurn: updatedGame.currentTurn,
        remainingGuesses: updatedGame.remainingGuesses,
        currentHintWord: updatedGame.currentHintWord,
        currentHintNumber: updatedGame.currentHintNumber,
        selectedCardId: updatedGame.selectedCardId,
        selectedByPlayerId: updatedGame.selectedByPlayerId,
        selectedAt: updatedGame.selectedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to pass turn.";
      socket.emit("game:error", { message });
    }
  });
}
