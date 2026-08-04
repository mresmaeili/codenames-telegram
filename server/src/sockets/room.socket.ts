import type { Server as SocketIOServer, Socket } from "socket.io";

import { leaveRoom } from "../services/lobby.service.js";
import {
  createRoom,
  joinRoom,
  startRoom,
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
import { RoomModel } from "../models/room.model.js";
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

interface RevealSocketPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
}

interface PassSocketPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
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
        typeof payload.team !== "string" ||
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
        };

        if (
          typeof settingsPayload.maxPlayers !== "number" ||
          typeof settingsPayload.allowSpectators !== "boolean" ||
          typeof settingsPayload.privateRoom !== "boolean"
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

      const result = applyCardSelection({
        game: {
          status: game.status,
          currentTurn: game.currentTurn,
          currentHintWord: game.currentHintWord ?? null,
          currentHintNumber: game.currentHintNumber ?? null,
          board: game.board,
          selectedCardId: game.selectedCardId ?? null,
          selectedByPlayerId: game.selectedByPlayerId ?? null,
          selectedAt: game.selectedAt ?? null,
        },
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
        cardId: payload.cardId,
      });

      const updatedGame = await gameRepository.update(payload.gameId, {
        selectedCardId: result.game.selectedCardId,
        selectedByPlayerId: result.game.selectedByPlayerId,
        selectedAt: result.game.selectedAt,
      });

      if (!updatedGame) {
        socket.emit("game:error", { message: "Unable to update selection." });
        return;
      }

      io.to(payload.roomCode.toUpperCase()).emit("game:selected", {
        gameId: updatedGame._id.toString(),
        selectedCardId: updatedGame.selectedCardId,
        selectedByPlayerId: updatedGame.selectedByPlayerId,
        selectedAt: updatedGame.selectedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to select card.";
      socket.emit("game:error", { message });
    }
  });

  socket.on("game:reveal", async (payload: RevealSocketPayload) => {
    try {
      if (
        typeof payload.gameId !== "string" ||
        typeof payload.roomCode !== "string" ||
        typeof payload.telegramId !== "number"
      ) {
        socket.emit("game:error", { message: "Invalid reveal payload." });
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

      const revealResult = applyCardReveal({
        game: {
          status: game.status,
          currentTurn: game.currentTurn,
          currentHintWord: game.currentHintWord ?? null,
          currentHintNumber: game.currentHintNumber ?? null,
          board: game.board,
          selectedCardId: game.selectedCardId ?? null,
          selectedByPlayerId: game.selectedByPlayerId ?? null,
          selectedAt: game.selectedAt ?? null,
        },
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
      });

      const turnResult = applyTurnOutcome({
        game: {
          ...revealResult.game,
          remainingGuesses: game.remainingGuesses,
          currentHintWord: game.currentHintWord ?? null,
          currentHintNumber: game.currentHintNumber ?? null,
          hintSubmittedAt: game.hintSubmittedAt ?? null,
          selectedCardId: game.selectedCardId ?? null,
          selectedByPlayerId: game.selectedByPlayerId ?? null,
          selectedAt: game.selectedAt ?? null,
        },
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
        revealedCardColor:
          game.board[Number.parseInt(game.selectedCardId ?? "", 10)]?.color ??
          null,
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
        error instanceof Error ? error.message : "Unable to reveal card.";
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
