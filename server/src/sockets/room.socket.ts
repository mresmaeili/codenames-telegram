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
import {
  revealCard,
  selectCard,
  submitHint,
} from "../services/game-command.service.js";
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
import { recordGameBroadcast } from "../utils/realtime-metrics.js";
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

type GameActionAcknowledgement = (error?: { message: string }) => void;

type PassSocketPayload = GamePassInputPayload;

function roleSocketRoom(
  roomCode: string,
  role: "operative" | "spymaster",
): string {
  return `${roomCode}:${role}s`;
}

function playerSocketRoom(roomCode: string, telegramId: number): string {
  return `${roomCode}:player:${telegramId}`;
}

async function joinSocketRoleRooms(
  socket: Socket,
  roomCode: string,
  telegramId: number,
  role: "operative" | "spymaster",
): Promise<void> {
  await socket.join(roomCode);
  await socket.join(playerSocketRoom(roomCode, telegramId));
  await socket.join(roleSocketRoom(roomCode, role));
}

async function updatePlayerRoleRooms(
  io: SocketIOServer,
  roomCode: string,
  telegramId: number,
  role: "operative" | "spymaster",
): Promise<void> {
  const playerRoom = playerSocketRoom(roomCode, telegramId);
  const nextRoleRoom = roleSocketRoom(roomCode, role);
  const previousRole = role === "spymaster" ? "operative" : "spymaster";
  io.in(playerRoom).socketsLeave(roleSocketRoom(roomCode, previousRole));
  await io.in(playerRoom).socketsJoin(nextRoleRoom);
}

function getActorTelegramId(
  socket: Socket,
  claimedTelegramId: unknown,
): number {
  const socketData = socket.data ?? {};
  if (
    env.DEV_MODE &&
    (socketData.devMode === true || typeof socketData.telegramId !== "number")
  ) {
    if (typeof claimedTelegramId === "number") return claimedTelegramId;
    throw new Error("Invalid actor identity.");
  }

  const authenticatedTelegramId = socket.data.telegramId;
  if (
    typeof authenticatedTelegramId !== "number" ||
    authenticatedTelegramId !== claimedTelegramId
  ) {
    throw new Error("Authenticated identity does not match the actor.");
  }

  return authenticatedTelegramId;
}

function hasTurnTimerExpired(
  game: {
    hintSubmittedAt?: Date | null;
    phaseStartedAt?: Date | null;
    turnStartedAt?: Date | null;
    createdAt?: Date;
  },
  room: {
    settings: {
      timer?: string;
      spymasterTimer?: number;
      operativeTimer?: number;
      firstClueBonus?: number;
    };
  },
): boolean {
  const phase = (game as { phase?: string }).phase;
  const isOperativePhase = phase === "operatives";
  const baseTimer = isOperativePhase
    ? (room.settings.operativeTimer ?? Number(room.settings.timer))
    : (room.settings.spymasterTimer ?? Number(room.settings.timer));
  const timerSeconds =
    !isOperativePhase &&
    !(game as { hintSubmittedAt?: Date | null }).hintSubmittedAt &&
    (game as { hintHistory?: unknown[] }).hintHistory?.length === 0
      ? baseTimer + (room.settings.firstClueBonus ?? 0)
      : baseTimer;
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

function gameBelongsToRoom(
  game: { roomId: string },
  room: { _id: { toString(): string } },
): boolean {
  return game.roomId === room._id.toString();
}

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

  socket.on(
    "game:sync",
    async (payload: { roomCode?: unknown; telegramId?: unknown }) => {
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

        emitGameStateToSocket(
          socket,
          room as unknown as Room,
          game,
          telegramId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to sync game.";
        socket.emit("game:error", { message });
      }
    },
  );

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

        const requesterTelegramId = getActorTelegramId(
          socket,
          payload.requesterTelegramId,
        );

        const requester = room.players.find(
          (p) => p.telegramId === requesterTelegramId,
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

  socket.on(
    "game:hint",
    async (
      payload: HintSocketPayload,
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
    "game:select",
    async (
      payload: SelectionSocketPayload,
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

        /* legacy inline confirm/reveal path
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
        senderTelegramId: actorTelegramId,
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

      const revealResult = applyCardReveal({
        game: selectionResult.game,
        room: { players: room.players },
        senderTelegramId: actorTelegramId,
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
            senderTelegramId: actorTelegramId,
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

      const updatedGame = await gameRepository.update(
        payload.gameId,
        {
          board: revealResult.game.board,
          ...getRemainingCardCounts(revealResult.game.board),
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
        },
        game.updatedAt,
      );

      if (!updatedGame) {
        socket.emit("game:error", { message: "Unable to reveal card." });
        return;
      }

      await emitGameState(
        io,
        payload.roomCode.toUpperCase(),
        room as unknown as Room,
        updatedGame,
      ); */
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to select card.";
        acknowledge?.({ message });
        socket.emit("game:error", { message });
      }
    },
  );

  socket.on(
    "game:pass",
    async (
      payload: PassSocketPayload,
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
