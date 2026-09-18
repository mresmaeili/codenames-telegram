import type { Server as SocketIOServer, Socket } from "socket.io";

import { leaveRoom } from "../services/lobby.service.js";
import {
  createRoom,
  kickRoomPlayer,
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
import { gameRepository } from "../repositories/game.repository.js";
import { roomRepository } from "../repositories/room.repository.js";
import { GameModel } from "../models/game.model.js";
import { RoomModel } from "../models/room.model.js";
import { env } from "../config/env.js";
import { recordGameBroadcast } from "../utils/realtime-metrics.js";
import {
  getActorTelegramId,
  joinSocketRoleRooms,
  markSocketPresence,
  playerSocketRoom,
  roleSocketRoom,
  updatePlayerRoleRooms,
} from "./room.socket.helpers.js";
import { registerDevelopmentSocketHandlers } from "./development.socket.js";
import { registerGameReadSocketHandlers } from "./game-read.socket.js";
import { registerGameActionSocketHandlers } from "./game-actions.socket.js";
import { registerGameSelectSocketHandler } from "./game-select.socket.js";

export { markSocketPresence } from "./room.socket.helpers.js";
import type { Room } from "../../../shared/src/types/room.js";
import type {
  RoomAssignPlayerPayload,
  RoomAdminPayload,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomKickPlayerPayload,
  RoomOwnerPayload,
  RoomSettingsPayload,
  RoomTransferOwnerPayload,
  RoomUpdateTeamPayload,
} from "../../../shared/src/types/socket.js";
type CreateRoomSocketPayload = RoomCreatePayload;

type JoinRoomSocketPayload = RoomJoinPayload;

type UpdateTeamSocketPayload = RoomUpdateTeamPayload;

type UpdateRoomSettingsSocketPayload = RoomSettingsPayload;

type StartRoomSocketPayload = RoomOwnerPayload;

type TransferHostSocketPayload = RoomTransferOwnerPayload;

type SetRoomAdminSocketPayload = RoomAdminPayload;

type AssignRoomPlayerSocketPayload = RoomAssignPlayerPayload;

type KickRoomPlayerSocketPayload = RoomKickPlayerPayload;

type ShuffleRoomTeamsSocketPayload = RoomOwnerPayload;

type ResetRoomTeamsSocketPayload = RoomOwnerPayload;

type ResetGameSocketPayload = RoomOwnerPayload;

interface LeaveRoomSocketPayload {
  roomCode?: unknown;
  userId?: unknown;
}

function buildGameSnapshotView(
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
  room: Room,
  viewerTelegramId: number,
  roleOverride?: "operative" | "spymaster",
) {
  if (!game || !room) return null;

  const viewerRole =
    roleOverride ??
    room.players.find((player) => player.telegramId === viewerTelegramId)
      ?.role ??
    "operative";

  return buildGameView({
    id: game._id?.toString(),
    roomId: game.roomId,
    theme: game.theme ?? room.settings.theme ?? "classic",
    stateVersion: game.stateVersion ?? 0,
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
    pendingSelections: game.pendingSelections ?? [],
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
  const startedAt = performance.now();

  const operativeView = buildGameSnapshotView(game, room, 0, "operative");
  const spymasterView = buildGameSnapshotView(game, room, 0, "spymaster");
  if (!operativeView || !spymasterView) return;

  const serverTime = new Date().toISOString();
  io.to(roleSocketRoom(roomCode, "operative")).emit("game:state", {
    room,
    game: operativeView,
    serverTime,
  });
  io.to(roleSocketRoom(roomCode, "spymaster")).emit("game:state", {
    room,
    game: spymasterView,
    serverTime,
  });
  recordGameBroadcast(performance.now() - startedAt, game.stateVersion ?? 0);
}

function emitGameStateToSocket(
  socket: Socket,
  room: Room,
  game: Awaited<ReturnType<typeof gameRepository.findById>>,
  telegramId: number,
): void {
  if (!game) return;
  const viewerRole =
    room.players.find((player) => player.telegramId === telegramId)?.role ??
    "operative";
  const gameView = buildGameSnapshotView(game, room, telegramId, viewerRole);
  if (!gameView) return;
  socket.emit("game:state", {
    room,
    game: gameView,
    serverTime: new Date().toISOString(),
  });
}

export function startGameTimer(io: SocketIOServer): () => void {
  void io;
  return () => undefined;
}

export function registerRoomSocketHandlers(
  io: SocketIOServer,
  socket: Socket,
): void {
  registerDevelopmentSocketHandlers(io, socket);
  registerGameReadSocketHandlers(io, socket, emitGameStateToSocket);
  registerGameActionSocketHandlers(io, socket, emitGameState);
  registerGameSelectSocketHandler(io, socket, emitGameState);

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
        ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
        ownerDisplayName: payload.ownerDisplayName,
        ownerAvatarId:
          typeof payload.ownerAvatarId === "string"
            ? payload.ownerAvatarId
            : undefined,
      });

      await joinSocketRoleRooms(
        socket,
        room.roomCode,
        payload.ownerTelegramId,
        "operative",
      );
      socket.data = {
        ...socket.data,
        telegramId: payload.ownerTelegramId,
        roomCode: room.roomCode,
      };
      markSocketPresence(io, room.roomCode, payload.ownerTelegramId, "online");
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

      if (
        !(
          env.DEV_MODE &&
          (socket.data?.devMode === true ||
            typeof socket.data?.telegramId !== "number")
        ) &&
        socket.data.telegramId !== payload.telegramId
      ) {
        socket.emit("room:error", { message: "Invalid socket identity." });
        return;
      }

      const room = await joinRoom({
        roomCode: payload.roomCode,
        telegramId: payload.telegramId,
        displayName: payload.displayName,
        avatarId:
          typeof payload.avatarId === "string" ? payload.avatarId : undefined,
      });

      const joinedPlayer = room.players.find(
        (player) => player.telegramId === payload.telegramId,
      );
      await joinSocketRoleRooms(
        socket,
        room.roomCode,
        payload.telegramId,
        joinedPlayer?.role === "spymaster" ? "spymaster" : "operative",
      );
      socket.data = {
        ...socket.data,
        telegramId: payload.telegramId,
        roomCode: room.roomCode,
      };
      markSocketPresence(io, room.roomCode, payload.telegramId, "online");
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
          telegramId: getActorTelegramId(socket, payload.telegramId),
          team: payload.team,
          role: payload.role,
        });

        await updatePlayerRoleRooms(
          io,
          room.roomCode,
          payload.telegramId,
          payload.role as "operative" | "spymaster",
        );
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
          ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
          targetTelegramId: payload.targetTelegramId,
        });

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
        creatorTelegramId: getActorTelegramId(
          socket,
          payload.creatorTelegramId,
        ),
        targetTelegramId: payload.targetTelegramId,
        isAdmin: payload.isAdmin,
      });

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
          actorTelegramId: getActorTelegramId(socket, payload.actorTelegramId),
          targetTelegramId: payload.targetTelegramId,
          team: payload.team,
          role: payload.role,
        });

        await updatePlayerRoleRooms(
          io,
          room.roomCode,
          payload.targetTelegramId,
          payload.role as "operative" | "spymaster",
        );
        io.to(room.roomCode).emit("room:updated", room);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Player assignment failed.";
        socket.emit("room:error", { message });
      }
    },
  );

  socket.on("room:kickPlayer", async (payload: KickRoomPlayerSocketPayload) => {
    try {
      if (
        typeof payload.roomCode !== "string" ||
        typeof payload.actorTelegramId !== "number" ||
        typeof payload.targetTelegramId !== "number"
      ) {
        socket.emit("room:error", {
          message: "Invalid kick player payload.",
        });
        return;
      }

      const actorTelegramId = getActorTelegramId(
        socket,
        payload.actorTelegramId,
      );
      const updatedRoom = await kickRoomPlayer({
        roomCode: payload.roomCode,
        actorTelegramId,
        targetTelegramId: payload.targetTelegramId,
      });

      io.to(updatedRoom.roomCode).emit("room:updated", updatedRoom);
      io.in(
        playerSocketRoom(updatedRoom.roomCode, payload.targetTelegramId),
      ).socketsLeave(updatedRoom.roomCode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Player kick failed.";
      socket.emit("room:error", { message });
    }
  });

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
          ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
        });

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
        ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
      });

      io.to(room.roomCode).emit("room:updated", room);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Team reset failed.";
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
          gameMode?: unknown;
          timer?: unknown;
          theme?: unknown;
          spymasterTimer?: unknown;
          operativeTimer?: unknown;
          firstClueBonus?: unknown;
          language?: unknown;
          wordPack?: unknown;
          customWords?: unknown;
        };

        if (
          typeof settingsPayload.maxPlayers !== "number" ||
          typeof settingsPayload.allowSpectators !== "boolean" ||
          typeof settingsPayload.privateRoom !== "boolean" ||
          typeof settingsPayload.gameMode !== "string" ||
          typeof settingsPayload.timer !== "string" ||
          typeof settingsPayload.spymasterTimer !== "number" ||
          typeof settingsPayload.operativeTimer !== "number" ||
          typeof settingsPayload.firstClueBonus !== "number" ||
          typeof settingsPayload.language !== "string" ||
          typeof settingsPayload.wordPack !== "string" ||
          (settingsPayload.theme !== undefined &&
            typeof settingsPayload.theme !== "string") ||
          (settingsPayload.customWords !== undefined &&
            (!Array.isArray(settingsPayload.customWords) ||
              !settingsPayload.customWords.every(
                (word): word is string => typeof word === "string",
              )))
        ) {
          socket.emit("room:error", {
            message: "Invalid room settings payload.",
          });
          return;
        }

        const room = await updateRoomSettings({
          roomCode: payload.roomCode,
          ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
          settings: {
            maxPlayers: settingsPayload.maxPlayers,
            allowSpectators: settingsPayload.allowSpectators,
            privateRoom: settingsPayload.privateRoom,
            gameMode: settingsPayload.gameMode as "standard" | "rush",
            timer: settingsPayload.timer as "none" | "30" | "60" | "90",
            theme:
              settingsPayload.theme === undefined
                ? undefined
                : (settingsPayload.theme as "classic" | "persian"),
            spymasterTimer: settingsPayload.spymasterTimer,
            operativeTimer: settingsPayload.operativeTimer,
            firstClueBonus: settingsPayload.firstClueBonus,
            language: settingsPayload.language as "fa" | "en" | "es" | "he",
            wordPack: settingsPayload.wordPack as
              | "classic"
              | "party"
              | "custom",
            customWords: settingsPayload.customWords as string[] | undefined,
          },
        });

        await Promise.all(
          room.players.map((player) =>
            updatePlayerRoleRooms(
              io,
              room.roomCode,
              player.telegramId,
              "operative",
            ),
          ),
        );
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
        ownerTelegramId: getActorTelegramId(socket, payload.ownerTelegramId),
      });

      const game = room.id ? await gameRepository.findByRoomId(room.id) : null;
      if (!game) {
        throw new Error("Game was not created for the room.");
      }
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
          player.telegramId ===
            getActorTelegramId(socket, payload.ownerTelegramId) &&
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

      const { game: newGame, room: updatedRoom } = await createGame({
        roomCode: payload.roomCode,
      });
      io.to(updatedRoom.roomCode).emit("room:updated", updatedRoom);
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

      const isOwner = room.ownerIds.includes(
        getActorTelegramId(socket, payload.ownerTelegramId),
      );
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
}
