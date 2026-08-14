import type { RoomDocument } from "../models/room.model.js";
import type { Room } from "../../../shared/src/types/room.js";

export function createRoomDocument(
  overrides: Partial<RoomDocument> = {},
): RoomDocument {
  const room = {
    _id: "room-id" as unknown as RoomDocument["_id"],
    roomCode: "ABC123",
    ownerId: 1,
    ownerIds: [1],
    players: [
      {
        userId: "owner-id",
        telegramId: 1,
        displayName: "Owner",
        team: "red",
        role: "spymaster",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      {
        userId: "player-id",
        telegramId: 2,
        displayName: "Player",
        team: "blue",
        role: "operative",
        joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
    status: "waiting" as Room["status"],
    settings: {
      maxPlayers: 4,
      allowSpectators: false,
      privateRoom: true,
      gameMode: "standard",
      timer: "60",
      language: "en",
      wordPack: "classic",
    },
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    save: async function save() {
      return this;
    },
    ...overrides,
  } as unknown as RoomDocument;

  return room;
}
