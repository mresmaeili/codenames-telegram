export type Team = "red" | "blue";
export type PlayerRole = "operative" | "spymaster";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayer {
  userId: string;
  telegramId: number;
  displayName: string;
  team: Team | null;
  role: PlayerRole;
  joinedAt: Date;
}

export interface RoomSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
}

export interface Room {
  id?: string;
  roomCode: string;
  ownerId: string;
  players: RoomPlayer[];
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}
