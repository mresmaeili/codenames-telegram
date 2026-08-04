import {
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
  ROOM_PLAYER_ROLES,
  ROOM_STATUSES,
  ROOM_TEAMS,
} from "../../../shared/src/constants/room.js";
import type {
  PlayerRole,
  Room,
  RoomPlayer,
  RoomSettings,
  RoomStatus,
  Team,
} from "../../../shared/src/types/room.js";
import { UserModel } from "../models/user.model.js";
import type { RoomDocument } from "../models/room.model.js";
import { roomRepository } from "../repositories/room.repository.js";
import { createGame } from "./game.service.js";

export interface CreateRoomInput {
  ownerId: string;
  ownerTelegramId: number;
  ownerDisplayName: string;
}

export interface CreateRoomResult {
  id: string;
  roomCode: string;
  ownerId: string;
  players: RoomPlayer[];
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinRoomInput {
  roomCode: string;
  telegramId: number;
  displayName: string;
}

export interface UpdateRoomPlayerAssignmentInput {
  roomCode: string;
  telegramId: number;
  team: unknown;
  role: unknown;
}

export interface UpdateRoomSettingsInput {
  roomCode: string;
  ownerTelegramId: number;
  settings: RoomSettings;
}

export interface StartRoomInput {
  roomCode: string;
  ownerTelegramId: number;
}

function createDefaultSettings(): RoomSettings {
  return {
    maxPlayers: ROOM_MAX_PLAYERS,
    allowSpectators: false,
    privateRoom: true,
  };
}

export async function generateUniqueRoomCode(): Promise<string> {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const roomCodeLength = 6;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    let candidate = "";

    for (let index = 0; index < roomCodeLength; index += 1) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      candidate += characters[randomIndex];
    }

    const existingRoom = await roomRepository.findByCode(candidate);
    if (!existingRoom) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique room code.");
}

function buildInitialPlayer(input: CreateRoomInput): RoomPlayer {
  return {
    userId: input.ownerId,
    telegramId: input.ownerTelegramId,
    displayName: input.ownerDisplayName,
    team: null,
    role: "operative",
    joinedAt: new Date(),
  };
}

function buildJoinPlayer(userId: string, input: JoinRoomInput): RoomPlayer {
  return {
    userId,
    telegramId: input.telegramId,
    displayName: input.displayName,
    team: null,
    role: "operative",
    joinedAt: new Date(),
  };
}

function validateCreateRoomInput(input: CreateRoomInput): void {
  if (!input.ownerId.trim()) {
    throw new Error("Owner ID is required.");
  }

  if (!input.ownerDisplayName.trim()) {
    throw new Error("Owner display name is required.");
  }

  if (!Number.isInteger(input.ownerTelegramId) || input.ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
  }
}

function validateAssignmentValues(
  team: unknown,
  role: unknown,
): {
  team: Team;
  role: PlayerRole;
} {
  if (typeof team !== "string" || !ROOM_TEAMS.includes(team as Team)) {
    throw new Error("Invalid team value.");
  }

  if (
    typeof role !== "string" ||
    !ROOM_PLAYER_ROLES.includes(role as PlayerRole)
  ) {
    throw new Error("Invalid role value.");
  }

  return {
    team: team as Team,
    role: role as PlayerRole,
  };
}

function validateRoomSettings(settings: RoomSettings): void {
  if (!Number.isInteger(settings.maxPlayers)) {
    throw new Error("Maximum players must be a whole number.");
  }

  if (
    settings.maxPlayers < ROOM_MIN_PLAYERS ||
    settings.maxPlayers > ROOM_MAX_PLAYERS
  ) {
    throw new Error("Maximum players must be between 2 and 16.");
  }

  if (typeof settings.allowSpectators !== "boolean") {
    throw new Error("Allow spectators must be a boolean.");
  }

  if (typeof settings.privateRoom !== "boolean") {
    throw new Error("Private room must be a boolean.");
  }
}

async function assertRoomOwner(
  room: RoomDocument,
  ownerTelegramId: number,
): Promise<void> {
  if (!Number.isInteger(ownerTelegramId) || ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
  }

  const ownerUser = await UserModel.findById(room.ownerId);
  if (!ownerUser || ownerUser.telegramId !== ownerTelegramId) {
    throw new Error("Only the room owner can change this room.");
  }
}

function collectReadinessErrors(room: RoomDocument): string[] {
  const errors: string[] = [];

  if (room.players.length < ROOM_MIN_PLAYERS) {
    errors.push(`At least ${ROOM_MIN_PLAYERS} players are required.`);
  }

  const redPlayers = room.players.filter((player) => player.team === "red");
  const bluePlayers = room.players.filter((player) => player.team === "blue");

  if (redPlayers.length === 0) {
    errors.push("At least one player must join the Red team.");
  }

  if (bluePlayers.length === 0) {
    errors.push("At least one player must join the Blue team.");
  }

  const redSpymasters = redPlayers.filter(
    (player) => player.role === "spymaster",
  );
  const blueSpymasters = bluePlayers.filter(
    (player) => player.role === "spymaster",
  );

  if (redSpymasters.length !== 1) {
    errors.push("Red team must have exactly one Spymaster.");
  }

  if (blueSpymasters.length !== 1) {
    errors.push("Blue team must have exactly one Spymaster.");
  }

  room.players.forEach((player) => {
    if (!player.team) {
      errors.push(`${player.displayName} must select a team.`);
    }
  });

  return errors;
}

function serializeRoom(room: RoomDocument): CreateRoomResult {
  return {
    id: room._id.toString(),
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    players: room.players,
    status: room.status,
    settings: room.settings,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

export async function createRoom(
  input: CreateRoomInput,
): Promise<CreateRoomResult> {
  validateCreateRoomInput(input);

  const roomCode = await generateUniqueRoomCode();
  const initialPlayer = buildInitialPlayer(input);
  const initialRoom: Partial<Room> = {
    roomCode,
    ownerId: input.ownerId,
    players: [initialPlayer],
    status: "waiting" as RoomStatus,
    settings: createDefaultSettings(),
  };

  const createdRoom = await roomRepository.create(initialRoom);

  return serializeRoom(createdRoom);
}

export async function joinRoom(
  input: JoinRoomInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  if (!Number.isInteger(input.telegramId) || input.telegramId <= 0) {
    throw new Error("Authenticated user is invalid.");
  }

  if (!input.displayName.trim()) {
    throw new Error("Display name is required.");
  }

  const normalizedRoomCode = input.roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedRoomCode)) {
    throw new Error("Invalid room code format.");
  }

  const authenticatedUser = await UserModel.findOne({
    telegramId: input.telegramId,
  });
  if (!authenticatedUser) {
    throw new Error("Authenticated user not found.");
  }

  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "waiting") {
    throw new Error("Room is not accepting players.");
  }

  const userId = authenticatedUser._id.toString();
  const alreadyJoined = room.players.some(
    (player) =>
      player.userId === userId || player.telegramId === input.telegramId,
  );

  if (alreadyJoined) {
    return serializeRoom(room);
  }

  if (room.players.length >= room.settings.maxPlayers) {
    throw new Error("Room is full.");
  }

  const nextPlayer = buildJoinPlayer(userId, input);
  room.players.push(nextPlayer);

  const updatedRoom = await room.save();

  return serializeRoom(updatedRoom);
}

export async function updateRoomPlayerAssignment(
  input: UpdateRoomPlayerAssignmentInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  if (!Number.isInteger(input.telegramId) || input.telegramId <= 0) {
    throw new Error("Authenticated user is invalid.");
  }

  const normalizedRoomCode = input.roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedRoomCode)) {
    throw new Error("Invalid room code format.");
  }

  const assignmentValues = validateAssignmentValues(input.team, input.role);
  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "waiting") {
    throw new Error("Room is not accepting players.");
  }

  const currentPlayer = room.players.find(
    (player) => player.telegramId === input.telegramId,
  );
  if (!currentPlayer) {
    throw new Error("User does not belong to this room.");
  }

  const spymasterExistsInTargetTeam = room.players.some(
    (player) =>
      player.telegramId !== input.telegramId &&
      player.team === assignmentValues.team &&
      player.role === "spymaster",
  );

  if (assignmentValues.role === "spymaster" && spymasterExistsInTargetTeam) {
    throw new Error("Maximum one Spymaster per team.");
  }

  currentPlayer.team = assignmentValues.team;
  currentPlayer.role = assignmentValues.role;

  const updatedRoom = await room.save();
  return serializeRoom(updatedRoom);
}

export async function updateRoomSettings(
  input: UpdateRoomSettingsInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  const normalizedRoomCode = input.roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedRoomCode)) {
    throw new Error("Invalid room code format.");
  }

  validateRoomSettings(input.settings);

  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "waiting") {
    throw new Error("Room is not accepting settings changes.");
  }

  await assertRoomOwner(room, input.ownerTelegramId);

  room.settings = input.settings;
  const updatedRoom = await room.save();
  return serializeRoom(updatedRoom);
}

export async function startRoom(
  input: StartRoomInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  const normalizedRoomCode = input.roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedRoomCode)) {
    throw new Error("Invalid room code format.");
  }

  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "waiting") {
    throw new Error("Room is not accepting a start request.");
  }

  await assertRoomOwner(room, input.ownerTelegramId);

  const readinessErrors = collectReadinessErrors(room);
  if (readinessErrors.length > 0) {
    throw new Error(`Room is not ready: ${readinessErrors.join(" ")}`);
  }

  room.status = "playing" as RoomStatus;
  const updatedRoom = await room.save();
  await createGame({ roomCode: normalizedRoomCode });

  return serializeRoom(updatedRoom);
}
