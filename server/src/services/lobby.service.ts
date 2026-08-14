import type { RoomDocument } from "../models/room.model.js";
import { roomRepository } from "../repositories/room.repository.js";
import type { Room, RoomPlayer } from "../../../shared/src/types/room.js";
import { UserModel } from "../models/user.model.js";

export interface LobbyRoomSnapshot extends Room {
  id: string;
}

export interface LeaveRoomInput {
  roomCode: string;
  userId: string;
}

async function serializeRoom(room: RoomDocument): Promise<LobbyRoomSnapshot> {
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
    // In test environments the DB may be unavailable; fall back to null photos.
    // eslint-disable-next-line no-console
    console.debug("lobby.serializeRoom: user lookup failed", e);
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

  const playersWithPhotos: RoomPlayer[] = room.players.map((p) => {
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

  // playersWithPhotos already built above including ghibliAvatarUrl

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

export async function getLobbyRoom(
  roomCode: string,
): Promise<LobbyRoomSnapshot | null> {
  const room = await roomRepository.findByCode(roomCode.toUpperCase());
  return room ? await serializeRoom(room) : null;
}

export async function leaveRoom(
  input: LeaveRoomInput,
): Promise<LobbyRoomSnapshot | null> {
  const room = await roomRepository.findByCode(input.roomCode.toUpperCase());
  if (!room) {
    throw new Error("Room not found.");
  }

  const nextPlayers = room.players.filter(
    (player) => player.userId !== input.userId,
  );
  if (nextPlayers.length === room.players.length) {
    throw new Error("Player not found in room.");
  }

  room.players = nextPlayers;
  const updatedRoom = await room.save();

  return await serializeRoom(updatedRoom);
}
