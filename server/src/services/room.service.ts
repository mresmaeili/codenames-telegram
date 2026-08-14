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
import { env } from "../config/env.js";

export interface CreateRoomInput {
  ownerId: string;
  ownerTelegramId: number;
  ownerDisplayName: string;
}

export interface CreateRoomResult {
  id: string;
  roomCode: string;
  ownerId: number;
  ownerIds: number[];
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

export interface TransferRoomOwnershipInput {
  roomCode: string;
  ownerTelegramId: number;
  targetTelegramId: number;
}

export interface ShuffleRoomTeamsInput {
  roomCode: string;
  ownerTelegramId: number;
}

export interface ResetRoomTeamsInput {
  roomCode: string;
  ownerTelegramId: number;
}

function createDefaultSettings(): RoomSettings {
  return {
    maxPlayers: ROOM_MAX_PLAYERS,
    allowSpectators: false,
    privateRoom: false,
    gameMode: "standard",
    timer: "60",
    language: "en",
    wordPack: "classic",
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

async function ensureUserExists(
  telegramId: number,
  displayName: string,
): Promise<string> {
  const existingUser = await UserModel.findOne({ telegramId });
  if (existingUser) {
    return existingUser._id.toString();
  }

  if (!env.DEV_MODE) {
    throw new Error("Authenticated user not found.");
  }

  const username =
    displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || null;

  const devUser = await UserModel.create({
    telegramId,
    username,
    firstName: displayName.trim() || "Developer",
    lastName: null,
    photoUrl: null,
    languageCode: "en",
    lastLoginAt: new Date(),
  });

  return devUser._id.toString();
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
  team: Team | null;
  role: PlayerRole;
} {
  if (
    team !== null &&
    (typeof team !== "string" || !ROOM_TEAMS.includes(team as Team))
  ) {
    throw new Error("Invalid team value.");
  }

  if (
    typeof role !== "string" ||
    !ROOM_PLAYER_ROLES.includes(role as PlayerRole)
  ) {
    throw new Error("Invalid role value.");
  }

  if (team === null && role !== "operative") {
    throw new Error("Spectators cannot be spymasters.");
  }

  return {
    team: team as Team | null,
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

  if (settings.gameMode !== "standard" && settings.gameMode !== "rush") {
    throw new Error("Invalid game mode.");
  }

  if (
    settings.timer !== "none" &&
    settings.timer !== "30" &&
    settings.timer !== "60" &&
    settings.timer !== "90"
  ) {
    throw new Error("Invalid timer setting.");
  }

  if (
    settings.language !== "fa" &&
    settings.language !== "en" &&
    settings.language !== "es" &&
    settings.language !== "he"
  ) {
    throw new Error("Invalid language setting.");
  }

  if (settings.wordPack !== "classic" && settings.wordPack !== "party") {
    throw new Error("Invalid word pack setting.");
  }
}

async function assertRoomOwner(
  room: RoomDocument,
  ownerTelegramId: number,
): Promise<void> {
  if (!Number.isInteger(ownerTelegramId) || ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
  }

  const ownerIds = Array.isArray(room.ownerIds)
    ? room.ownerIds
    : [room.ownerId];

  if (ownerIds.includes(ownerTelegramId) || room.ownerId === ownerTelegramId) {
    return;
  }

  const ownerUser = await UserModel.findOne({ telegramId: ownerTelegramId });
  if (!ownerUser) {
    const directOwner = room.players.some(
      (player) => player.telegramId === ownerTelegramId,
    );
    if (!directOwner) {
      throw new Error("Only the room owner can change this room.");
    }
    return;
  }

  const isOwnerPlayer = room.players.some(
    (player) => player.telegramId === ownerTelegramId,
  );

  if (!isOwnerPlayer) {
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
    if (!player.team && !room.settings.allowSpectators) {
      errors.push(`${player.displayName} must select a team.`);
    }
  });

  return errors;
}

async function serializeRoom(room: RoomDocument): Promise<CreateRoomResult> {
  const telegramIds = room.players.map((p) => p.telegramId);
  let users: Array<{
    telegramId: number;
    photoUrl?: string | null;
    ghibliAvatarUrl?: string | null;
  }> = [];
  try {
    users = await UserModel.find({ telegramId: { $in: telegramIds } })
      .select("telegramId photoUrl ghibliAvatarUrl")
      .exec();
  } catch (e) {
    // Tests may run without a connected DB; fall back to empty users list.
    // eslint-disable-next-line no-console
    console.debug(
      "serializeRoom: user lookup failed, falling back to null photos",
      e,
    );
    users = [];
  }

  const photoMap = new Map<
    number,
    { photoUrl: string | null; ghibliAvatarUrl: string | null }
  >();
  users.forEach((u) =>
    photoMap.set(u.telegramId, {
      photoUrl: (u.photoUrl as string) ?? null,
      ghibliAvatarUrl: (u.ghibliAvatarUrl as string) ?? null,
    }),
  );

  const playersWithPhotos = room.players.map((p) => {
    const mapped = photoMap.get(p.telegramId) ?? {
      photoUrl: null,
      ghibliAvatarUrl: null,
    };
    return {
      ...p,
      photoUrl: mapped.photoUrl,
      ghibliAvatarUrl: mapped.ghibliAvatarUrl,
    };
  });

  return {
    id: room._id.toString(),
    roomCode: room.roomCode,
    ownerId: Number(room.ownerId),
    ownerIds: (Array.isArray(room.ownerIds)
      ? room.ownerIds
      : [room.ownerId]
    ).map((id) => Number(id)),
    players: playersWithPhotos,
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
    ownerId: input.ownerTelegramId,
    ownerIds: [input.ownerTelegramId],
    players: [initialPlayer],
    status: "waiting" as RoomStatus,
    settings: createDefaultSettings(),
  };

  const createdRoom = await roomRepository.create(initialRoom);

  return await serializeRoom(createdRoom);
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

  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "waiting") {
    throw new Error("Room is not accepting players.");
  }

  const alreadyJoined = room.players.some(
    (player) => player.telegramId === input.telegramId,
  );

  if (alreadyJoined) {
    return await serializeRoom(room);
  }

  if (room.settings.privateRoom) {
    throw new Error("Room is private. New players cannot join by room code.");
  }

  const userId = await ensureUserExists(input.telegramId, input.displayName);

  if (room.players.length >= room.settings.maxPlayers) {
    throw new Error("Room is full.");
  }

  const nextPlayer = buildJoinPlayer(userId, input);
  room.players.push(nextPlayer);

  const updatedRoom = await room.save();

  return await serializeRoom(updatedRoom);
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

  if (assignmentValues.team === null && !room.settings.allowSpectators) {
    throw new Error("Spectators are not allowed in this room.");
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
  return await serializeRoom(updatedRoom);
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
  return await serializeRoom(updatedRoom);
}

export async function transferRoomOwnership(
  input: TransferRoomOwnershipInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  if (!Number.isInteger(input.ownerTelegramId) || input.ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
  }

  if (
    !Number.isInteger(input.targetTelegramId) ||
    input.targetTelegramId <= 0
  ) {
    throw new Error("Target Telegram ID is invalid.");
  }

  const normalizedRoomCode = input.roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedRoomCode)) {
    throw new Error("Invalid room code format.");
  }

  const room = await roomRepository.findByCode(normalizedRoomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  await assertRoomOwner(room, input.ownerTelegramId);

  const targetPlayer = room.players.find(
    (player) => player.telegramId === input.targetTelegramId,
  );

  if (!targetPlayer) {
    throw new Error("Target user is not a member of this room.");
  }

  const ownerIds = Array.isArray(room.ownerIds)
    ? room.ownerIds
    : [room.ownerId];
  if (!ownerIds.includes(targetPlayer.telegramId)) {
    ownerIds.push(targetPlayer.telegramId);
  }

  room.ownerIds = ownerIds;
  const updatedRoom = await room.save();
  return await serializeRoom(updatedRoom);
}

export async function shuffleRoomTeams(
  input: ShuffleRoomTeamsInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  if (!Number.isInteger(input.ownerTelegramId) || input.ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
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
    throw new Error("Room is not accepting team changes.");
  }

  await assertRoomOwner(room, input.ownerTelegramId);

  const activePlayers = room.players.filter((player) => player.team !== null);
  const shuffled = [...activePlayers];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  const breakPoint = Math.ceil(shuffled.length / 2);
  const redMirror = shuffled.slice(0, breakPoint);
  const blueMirror = shuffled.slice(breakPoint);

  room.players.forEach((player) => {
    if (!player.team) {
      return;
    }

    player.team = null;
    player.role = "operative";
  });

  redMirror.forEach((player) => {
    const target = room.players.find(
      (candidate) => candidate.userId === player.userId,
    );
    if (target) {
      target.team = "red";
      target.role = "operative";
    }
  });

  blueMirror.forEach((player) => {
    const target = room.players.find(
      (candidate) => candidate.userId === player.userId,
    );
    if (target) {
      target.team = "blue";
      target.role = "operative";
    }
  });

  if (redMirror.length > 0) {
    const firstRed = room.players.find(
      (player) => player.userId === redMirror[0]?.userId,
    );
    if (firstRed) {
      firstRed.role = "spymaster";
    }
  }

  if (blueMirror.length > 0) {
    const firstBlue = room.players.find(
      (player) => player.userId === blueMirror[0]?.userId,
    );
    if (firstBlue) {
      firstBlue.role = "spymaster";
    }
  }

  const updatedRoom = await room.save();
  return await serializeRoom(updatedRoom);
}

export async function resetRoomTeams(
  input: ResetRoomTeamsInput,
): Promise<CreateRoomResult> {
  if (!input.roomCode.trim()) {
    throw new Error("Room code is required.");
  }

  if (!Number.isInteger(input.ownerTelegramId) || input.ownerTelegramId <= 0) {
    throw new Error("Owner Telegram ID is invalid.");
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
    throw new Error("Room is not accepting team changes.");
  }

  await assertRoomOwner(room, input.ownerTelegramId);

  room.players.forEach((player) => {
    player.team = null;
    player.role = "operative";
  });

  const updatedRoom = await room.save();
  return await serializeRoom(updatedRoom);
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

  return await serializeRoom(updatedRoom);
}
