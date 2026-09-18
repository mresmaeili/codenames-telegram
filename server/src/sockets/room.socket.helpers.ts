import type { Server as SocketIOServer, Socket } from "socket.io";

import { env } from "../config/env.js";

export function roleSocketRoom(
  roomCode: string,
  role: "operative" | "spymaster",
): string {
  return `${roomCode}:${role}s`;
}

export function playerSocketRoom(roomCode: string, telegramId: number): string {
  return `${roomCode}:player:${telegramId}`;
}

const roomPresence = new Map<string, Map<number, "online" | "offline">>();

export function markSocketPresence(
  io: SocketIOServer,
  roomCode: string,
  telegramId: number,
  presence: "online" | "offline",
): void {
  const normalizedRoomCode = roomCode.toUpperCase();
  const players = roomPresence.get(normalizedRoomCode) ?? new Map();
  players.set(telegramId, presence);
  roomPresence.set(normalizedRoomCode, players);
  io.to(normalizedRoomCode).emit("room:presence", {
    roomCode: normalizedRoomCode,
    players: Array.from(players, ([playerTelegramId, status]) => ({
      telegramId: playerTelegramId,
      presence: status,
    })),
  });
}

export async function joinSocketRoleRooms(
  socket: Socket,
  roomCode: string,
  telegramId: number,
  role: "operative" | "spymaster",
): Promise<void> {
  await socket.join(roomCode);
  await socket.join(playerSocketRoom(roomCode, telegramId));
  await socket.join(roleSocketRoom(roomCode, role));
}

export async function updatePlayerRoleRooms(
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

export function getActorTelegramId(
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

export function hasTurnTimerExpired(
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

export function gameBelongsToRoom(
  game: { roomId: string },
  room: { _id: { toString(): string } },
): boolean {
  return game.roomId === room._id.toString();
}

export function generateBotTelegramId(botName: string): number {
  let hash = 0;
  for (let index = 0; index < botName.length; index += 1) {
    hash = (hash << 5) - hash + botName.charCodeAt(index);
    hash |= 0;
  }

  const normalized = Math.abs(hash) % 900000000;
  return normalized + 100000000;
}

export function chooseBotTeam(room: {
  players: Array<{ team: string | null }>;
}): "red" | "blue" {
  const redPlayers = room.players.filter((player) => player.team === "red");
  const bluePlayers = room.players.filter((player) => player.team === "blue");

  if (redPlayers.length === bluePlayers.length) {
    return Math.random() < 0.5 ? "red" : "blue";
  }

  return redPlayers.length < bluePlayers.length ? "red" : "blue";
}

export function chooseBotRole(
  room: { players: Array<{ team: string | null; role: string }> },
  team: string,
): "operative" | "spymaster" {
  const hasTeamSpymaster = room.players.some(
    (player) => player.team === team && player.role === "spymaster",
  );

  return hasTeamSpymaster ? "operative" : "spymaster";
}
