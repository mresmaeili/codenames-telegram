export const ROOM_MAX_PLAYERS = 16;
export const ROOM_MIN_PLAYERS = 2;

export const ROOM_TEAMS: ReadonlyArray<"red" | "blue"> = ["red", "blue"];

export const ROOM_PLAYER_ROLES: ReadonlyArray<"operative" | "spymaster"> = [
  "operative",
  "spymaster",
];

export const ROOM_STATUSES: ReadonlyArray<"waiting" | "playing" | "finished"> =
  ["waiting", "playing", "finished"];
