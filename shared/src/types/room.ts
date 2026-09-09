export type Team = "red" | "blue";
export type PlayerRole = "operative" | "spymaster";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayer {
  userId: string;
  telegramId: number;
  displayName: string;
  avatarId?: string | null;
  photoUrl?: string | null;
  ghibliAvatarUrl?: string | null;
  team: Team | null;
  role: PlayerRole;
  joinedAt: Date;
}

export interface RoomSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
  gameMode: "standard" | "rush";
  timer: "none" | "30" | "60" | "90";
  spymasterTimer?: number;
  operativeTimer?: number;
  firstClueBonus?: number;
  language: "fa" | "en" | "es" | "he";
  wordPack: "classic" | "party" | "custom";
  customWords?: string[];
}

export interface Room {
  id?: string;
  roomCode: string;
  ownerId: number;
  ownerIds: number[];
  players: RoomPlayer[];
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}
