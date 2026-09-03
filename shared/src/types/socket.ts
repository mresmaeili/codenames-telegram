import type { GameView } from "./game.js";
import type { Room } from "./room.js";

export interface GameStateSnapshot {
  room: Room;
  game: GameView;
  serverTime: string;
}

export interface RoomJoinPayload {
  roomCode: string;
  telegramId: number;
  displayName: string;
}

export interface GameKeycardPayload {
  roomCode?: unknown;
  requesterTelegramId?: unknown;
}

export interface RoomResetPayload {
  roomCode?: unknown;
}

export interface GameDebugRevealPayload {
  roomCode?: unknown;
}

export interface GameHintInputPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
  word?: unknown;
  number?: unknown;
}

export interface GameSelectInputPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
  cardId?: unknown;
  confirm?: unknown;
}

export interface GamePassInputPayload {
  gameId?: unknown;
  roomCode?: unknown;
  telegramId?: unknown;
  timeout?: unknown;
}

export interface GameHintPayload {
  gameId: string;
  roomCode: string;
  telegramId: number;
  word: string;
  number: number;
}

export interface GameSelectPayload {
  gameId: string;
  roomCode: string;
  telegramId: number;
  cardId: string;
  confirm: boolean;
}

export interface GamePassPayload {
  gameId: string;
  roomCode: string;
  telegramId: number;
  timeout: boolean;
}

export interface RoomCreatePayload {
  ownerId?: unknown;
  ownerTelegramId?: unknown;
  ownerDisplayName?: unknown;
}

export interface RoomUpdateTeamPayload {
  roomCode?: unknown;
  telegramId?: unknown;
  team?: unknown;
  role?: unknown;
}

export interface RoomSettingsPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
  settings?: unknown;
}

export interface RoomOwnerPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
}

export interface RoomAssignPlayerPayload {
  roomCode?: unknown;
  actorTelegramId?: unknown;
  targetTelegramId?: unknown;
  team?: unknown;
  role?: unknown;
}

export interface RoomTransferOwnerPayload {
  roomCode?: unknown;
  ownerTelegramId?: unknown;
  targetTelegramId?: unknown;
}

export interface RoomAdminPayload {
  roomCode?: unknown;
  creatorTelegramId?: unknown;
  targetTelegramId?: unknown;
  isAdmin?: unknown;
}
