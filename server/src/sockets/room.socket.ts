import type { Server as SocketIOServer, Socket } from "socket.io";

import { leaveRoom } from "../services/lobby.service.js";
import {
  createRoom,
  joinRoom,
  resetRoomTeams,
  assignRoomPlayer,
  setRoomAdmin,
  shuffleRoomTeams,
  startRoom,
  transferRoomOwnership,
  updateRoomPlayerAssignment,
  updateRoomSettings,
} from "../services/room.service.js";
import {
  createGame,
  getRemainingCardCounts,
  buildGameView,
} from "../services/game.service.js";
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
import type { Room } from "../../../shared/src/types/room.js";
import type {
  RoomAssignPlayerPayload,
  RoomAdminPayload,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomOwnerPayload,
  RoomSettingsPayload,
  RoomTransferOwnerPayload,
  RoomUpdateTeamPayload,
  GameDebugRevealPayload,
  GameHintInputPayload,
  GameKeycardPayload,
  GamePassInputPayload,
  GameSelectInputPayload,
  RoomResetPayload,
} from "../../../shared/src/types/socket.js";
type CreateRoomSocketPayload = RoomCreatePayload;

type JoinRoomSocketPayload = RoomJoinPayload;

type UpdateTeamSocketPayload = RoomUpdateTeamPayload;

type UpdateRoomSettingsSocketPayload = RoomSettingsPayload;

type StartRoomSocketPayload = RoomOwnerPayload;

type TransferHostSocketPayload = RoomTransferOwnerPayload;

type SetRoomAdminSocketPayload = RoomAdminPayload;

type AssignRoomPlayerSocketPayload = RoomAssignPlayerPayload;

type ShuffleRoomTeamsSocketPayload = RoomOwnerPayload;

type ResetRoomTeamsSocketPayload = RoomOwnerPayload;

type ResetGameSocketPayload = RoomOwnerPayload;

interface LeaveRoomSocketPayload {
  roomCode?: unknown;
  userId?: unknown;
}

type HintSocketPayload = GameHintInputPayload;

type SelectionSocketPayload = GameSelectInputPayload;

type PassSocketPayload = GamePassInputPayload;

function hasTurnTimerExpired(
  game: {
    hintSubmittedAt?: Date | null;
    phaseStartedAt?: Date | null;
    turnStartedAt?: Date | null;
    createdAt?: Date;
  },
  room: { settings: { timer?: string } },
): boolean {
  const timerSeconds = Number(room.settings.timer);
  if (
    !Number.isFinite(timerSeconds) ||
    timerSeconds <= 0 ||
    !(
      game.phaseStartedAt ??
      game.turnStartedAt ??
      game.hintSubmittedAt ??
      game.createdAt
    )
  ) {
    return false;
  }

  return (
    Date.now() -
      new Date(
        game.phaseStartedAt ??
          game.turnStartedAt ??
          game.hintSubmittedAt ??
          game.createdAt ??
          0,
      ).getTime() >=
    timerSeconds * 1000
  );
}

interface AddBotSocketPayload {
  roomCode?: unknown;
  botName?: unknown;
}

type ResetRoomSocketPayload = RoomResetPayload;

type DebugRevealSocketPayload = GameDebugRevealPayload;

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

function buildGameSnapshotView(
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
  room: Room,
  viewerTelegramId: number,
) {
  if (!game || !room) return null;

  const viewerRole =
    room.players.find((player) => player.telegramId === viewerTelegramId)
      ?.role ?? "operative";

  return buildGameView({
    id: game._id?.toString(),
    roomId: game.roomId,
    status: game.status,
    board: game.board,
    startingTeam: game.startingTeam,
    currentTurn: game.currentTurn,
    remainingGuesses: game.remainingGuesses,
    currentHintWord: game.currentHintWord ?? null,
    currentHintNumber: game.currentHintNumber ?? null,
    hintSubmittedAt: game.hintSubmittedAt ?? null,
    phase: game.phase ?? (game.currentHintWord ? "operatives" : "spymaster"),
    phaseStartedAt:
      game.phaseStartedAt ??
      game.hintSubmittedAt ??
      game.turnStartedAt ??
      game.createdAt,
    turnStartedAt: game.turnStartedAt ?? game.createdAt,
    hintHistory: game.hintHistory ?? [],
    rounds: game.rounds ?? [],
    selectedCardId: game.selectedCardId ?? null,
    selectedByPlayerId: game.selectedByPlayerId ?? null,
    selectedAt: game.selectedAt ?? null,
    winningTeam: game.winningTeam ?? null,
    completionReason: game.completionReason ?? null,
    completedAt: game.completedAt ?? null,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    role: viewerRole,
  });
}

async function emitGameState(
  io: SocketIOServer,
  roomCode: string,
  room: Room,
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
): Promise<void> {
  if (!room || !game) return;

  const connectedSockets = await io.in(roomCode).fetchSockets();
  await Promise.all(
    connectedSockets.map(async (connectedSocket) => {
      const viewerTelegramId = connectedSocket.data.telegramId;
      if (typeof viewerTelegramId !== "number") return;

      const gameView = buildGameSnapshotView(game, room, viewerTelegramId);
      if (!gameView) return;

      connectedSocket.emit("game:state", {
        room,
        game: gameView,
        serverTime: new Date().toISOString(),
      });
    }),
  );
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
      socket.data = {
        ...socket.data,
        telegramId: payload.telegramId,
        roomCode: room.roomCode,
      };
      socket.emit("room:joined", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room join failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on(
    "room:updateTeam",
    async (
      payload: UpdateTeamSocketPayload,
      callback?: (response?: { error?: string }) => void,
    ) => {
      try {
        if (
          typeof payload.roomCode !== "string" ||
          typeof payload.telegramId !== "number" ||
          !(typeof payload.team === "string" || payload.team === null) ||
          typeof payload.role !== "string"
        ) {
          const message = "Invalid room assignment payload.";
          socket.emit("room:error", { message });
          callback?.({ error: message });
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
        callback?.({});
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Team assignment failed.";
        socket.emit("room:error", { message });
        callback?.({ error: message });
      }
    },
  );

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

  socket.on("room:setAdmin", async (payload: SetRoomAdminSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.creatorTelegramId !== "number" ||
        typeof payload.targetTelegramId !== "number" ||
        typeof payload.isAdmin !== "boolean"
      ) {
        socket.emit("room:error", {
          message: "Invalid admin assignment payload.",
        });
        return;
      }

      const room = await setRoomAdmin({
        roomCode: payload.roomCode,
        creatorTelegramId: payload.creatorTelegramId,
        targetTelegramId: payload.targetTelegramId,
        isAdmin: payload.isAdmin,
      });

      socket.emit("room:updated", room);
      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Admin assignment failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on(
    "room:assignPlayer",
    async (payload: AssignRoomPlayerSocketPayload) => {
      try {
        if (
          typeof payload.roomCode !== "string" ||
          typeof payload.actorTelegramId !== "number" ||
          typeof payload.targetTelegramId !== "number" ||
          !(typeof payload.team === "string" || payload.team === null) ||
          typeof payload.role !== "string"
        ) {
          socket.emit("room:error", {
            message: "Invalid player assignment payload.",
          });
          return;
        }

        const room = await assignRoomPlayer({
          roomCode: payload.roomCode,
          actorTelegramId: payload.actorTelegramId,
          targetTelegramId: payload.targetTelegramId,
          team: payload.team,
          role: payload.role,
        });

        socket.emit("room:updated", room);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Player assignment failed.";
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
            language: settingsPayload.language as "fa" | "en" | "es" | "he",
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
        ...getRemainingCardCounts(game.board),
      });
      await emitGameState(io, room.roomCode, room, game);
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
          room.ownerIds.includes(player.telegramId),
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
        ...getRemainingCardCounts(newGame.board),
      });
      await emitGameState(io, room.roomCode, room, newGame);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Room rematch failed.";
      socket.emit("room:error", { message });
    }
  });

  socket.on("room:resetGame", async (payload: ResetGameSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.ownerTelegramId !== "number"
      ) {
        socket.emit("room:error", { message: "Invalid game reset payload." });
        return;
      }

      const normalizedRoomCode = payload.roomCode.toUpperCase();
      const room = await roomRepository.findByCode(normalizedRoomCode);
      if (!room) {
        socket.emit("room:error", { message: "Room not found." });
        return;
      }

      const isOwner = room.ownerIds.includes(payload.ownerTelegramId);
      if (!isOwner) {
        socket.emit("room:error", {
          message: "Only the room owner can reset the game.",
        });
        return;
      }

      const existingGame = await gameRepository.findByRoomId(
        room._id.toString(),
      );
      if (existingGame) {
        await GameModel.deleteOne({ _id: existingGame._id }).exec();
      }

      room.status = "waiting";
      const updatedRoom = await room.save();

      io.to(normalizedRoomCode).emit("room:reset", {
        roomCode: normalizedRoomCode,
      });
      io.to(normalizedRoomCode).emit("room:updated", updatedRoom);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Game reset failed.";
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

      const hint = result.game.hintHistory[result.game.hintHistory.length - 1];
      const roundHint = {
        ...hint,
        playerId:
          room.players.find(
            (player) => player.telegramId === payload.telegramId,
          )?.userId ?? null,
      };
      const rounds = [
        ...(game.rounds ?? []),
        {
          id: `round-${hint.submittedAt.toISOString()}`,
          team: hint.team,
          hint: roundHint,
          guesses: [],
        },
      ];

      const updatedGame = await gameRepository.update(payload.gameId, {
        currentHintWord: result.game.currentHintWord,
        currentHintNumber: result.game.currentHintNumber,
        remainingGuesses: result.game.remainingGuesses,
        hintSubmittedAt: result.game.hintSubmittedAt,
        hintHistory: result.game.hintHistory,
        rounds,
        phase: "operatives",
        phaseStartedAt: result.game.hintSubmittedAt,
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
        rounds: updatedGame.rounds ?? [],
      });
      await emitGameState(
        io,
        payload.roomCode.toUpperCase(),
        room as unknown as Room,
        updatedGame,
      );
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

      const selectionContext = {
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
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
        cardId: payload.cardId,
      };

      const validation =
        payload.confirm === true && game.selectedCardId === payload.cardId
          ? { ok: true as const }
          : validateGameplayAction({ game: selectionContext.game });

      if (!validation.ok) {
        socket.emit("game:error", { message: validation.error });
        return;
      }

      if (payload.confirm === true && game.selectedCardId !== payload.cardId) {
        socket.emit("game:error", {
          message: "Confirm the currently selected card.",
        });
        return;
      }

      const selectionResult =
        payload.confirm === true && game.selectedCardId === payload.cardId
          ? { game: selectionContext.game }
          : applyCardSelection({
              ...selectionContext,
            });

      if (payload.confirm === false) {
        const selectedGame = await gameRepository.update(payload.gameId, {
          selectedCardId: selectionResult.game.selectedCardId,
          selectedByPlayerId: selectionResult.game.selectedByPlayerId,
          selectedAt: selectionResult.game.selectedAt,
        });

        if (!selectedGame) {
          socket.emit("game:error", { message: "Unable to select card." });
          return;
        }

        io.to(payload.roomCode.toUpperCase()).emit("game:selected", {
          gameId: selectedGame._id.toString(),
          selectedCardId: selectedGame.selectedCardId,
          selectedByPlayerId: selectedGame.selectedByPlayerId,
          selectedAt: selectedGame.selectedAt,
        });
        await emitGameState(
          io,
          payload.roomCode.toUpperCase(),
          room as unknown as Room,
          selectedGame,
        );
        return;
      }

      const revealResult = applyCardReveal({
        game: selectionResult.game,
        room: { players: room.players },
        senderTelegramId: payload.telegramId,
      });

      const selectedCardColor =
        selectionResult.game.board[Number.parseInt(payload.cardId, 10)]
          ?.color ?? null;
      const revealedCardIndex = Number.parseInt(payload.cardId, 10);
      const revealedCard = selectionResult.game.board[revealedCardIndex];
      const revealedByPlayerId = selectionResult.game.selectedByPlayerId;

      const completionResult = applyGameCompletion({
        game: {
          ...revealResult.game,
          status: revealResult.game.status,
          startingTeam: game.startingTeam,
          winningTeam: game.winningTeam ?? null,
          completionReason: game.completionReason ?? null,
          completedAt: game.completedAt ?? null,
        },
      });

      const resolvedGame = completionResult.completed
        ? completionResult.game
        : applyTurnOutcome({
            game: revealResult.game,
            room: { players: room.players },
            senderTelegramId: payload.telegramId,
            revealedCardColor: selectedCardColor,
          }).game;

      const rounds = [...(game.rounds ?? [])];
      const currentRound = rounds[rounds.length - 1];
      if (currentRound && revealedCard) {
        rounds[rounds.length - 1] = {
          ...currentRound,
          guesses: [
            ...currentRound.guesses,
            {
              word: revealedCard.word,
              cardIndex: revealedCardIndex,
              playerId: revealedByPlayerId,
              correct: selectedCardColor === game.currentTurn,
              revealedAt: new Date(),
            },
          ],
        };
      }

      const updatedGame = await gameRepository.update(payload.gameId, {
        board: revealResult.game.board,
        redCardsRemaining: revealResult.game.board.filter(
          (card) => card.color === "red" && !card.revealed,
        ).length,
        blueCardsRemaining: revealResult.game.board.filter(
          (card) => card.color === "blue" && !card.revealed,
        ).length,
        status: resolvedGame.status,
        currentTurn: resolvedGame.currentTurn,
        remainingGuesses: resolvedGame.remainingGuesses,
        currentHintWord: resolvedGame.currentHintWord,
        currentHintNumber: resolvedGame.currentHintNumber,
        hintSubmittedAt: resolvedGame.hintSubmittedAt,
        selectedCardId: resolvedGame.selectedCardId,
        selectedByPlayerId: resolvedGame.selectedByPlayerId,
        selectedAt: resolvedGame.selectedAt,
        winningTeam: completionResult.completed
          ? completionResult.game.winningTeam
          : (game.winningTeam ?? null),
        completionReason: completionResult.completed
          ? completionResult.game.completionReason
          : (game.completionReason ?? null),
        completedAt: completionResult.completed
          ? completionResult.game.completedAt
          : (game.completedAt ?? null),
        rounds,
        ...(resolvedGame.currentTurn !== game.currentTurn
          ? {
              turnStartedAt: new Date(),
              phase: "spymaster",
              phaseStartedAt: new Date(),
            }
          : {}),
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
        redCardsRemaining: updatedGame.board.filter(
          (card) => card.color === "red" && !card.revealed,
        ).length,
        blueCardsRemaining: updatedGame.board.filter(
          (card) => card.color === "blue" && !card.revealed,
        ).length,
        currentHintWord: updatedGame.currentHintWord,
        currentHintNumber: updatedGame.currentHintNumber,
        status: updatedGame.status,
        selectedCardId: updatedGame.selectedCardId,
        selectedByPlayerId: updatedGame.selectedByPlayerId,
        selectedAt: updatedGame.selectedAt,
        winningTeam: updatedGame.winningTeam,
        completionReason: updatedGame.completionReason,
        completedAt: updatedGame.completedAt,
        turnStartedAt: updatedGame.turnStartedAt,
        phase: updatedGame.phase,
        phaseStartedAt: updatedGame.phaseStartedAt,
        revealedCardIndex,
        revealedCardColor: revealedCard?.color ?? null,
        revealedByPlayerId,
      });
      await emitGameState(
        io,
        payload.roomCode.toUpperCase(),
        room as unknown as Room,
        updatedGame,
      );
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
        senderTelegramId: payload.telegramId,
        allowTimeout: timeoutAllowed,
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
        phase: "spymaster",
        phaseStartedAt: new Date(),
        turnStartedAt: new Date(),
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
        turnStartedAt: updatedGame.turnStartedAt,
        phase: updatedGame.phase,
        phaseStartedAt: updatedGame.phaseStartedAt,
      });
      await emitGameState(
        io,
        payload.roomCode.toUpperCase(),
        room as unknown as Room,
        updatedGame,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to pass turn.";
      socket.emit("game:error", { message });
    }
  });
}
