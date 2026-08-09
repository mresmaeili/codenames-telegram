import type { RoomDocument } from "../models/room.model.js";
import { roomRepository } from "../repositories/room.repository.js";
import type { Room, RoomPlayer } from "../../../shared/src/types/room.js";

export interface LobbyRoomSnapshot extends Room {
  id: string;
}

export interface LeaveRoomInput {
  roomCode: string;
  userId: string;
}

function serializeRoom(room: RoomDocument): LobbyRoomSnapshot {
  return {
    id: room._id.toString(),
    roomCode: room.roomCode,
    ownerId: room.ownerId,
    ownerIds: Array.isArray(room.ownerIds) ? room.ownerIds : [room.ownerId],
    players: room.players,
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
  return room ? serializeRoom(room) : null;
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

  return serializeRoom(updatedRoom);
}
