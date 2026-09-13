import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { Room } from "@/../shared/src/types/room";

interface UseRoomSocketSyncOptions {
  socket: Socket | null;
  onRoomUpdated: (room: Room) => void;
  onRoomReset: () => void;
  onPresence?: (payload: {
    roomCode?: unknown;
    players?: Array<{ telegramId: number; presence: "online" | "offline" }>;
  }) => void;
}

export function useRoomSocketSync({
  socket,
  onRoomUpdated,
  onRoomReset,
  onPresence,
}: UseRoomSocketSyncOptions): void {
  const callbacks = useRef({ onRoomUpdated, onRoomReset, onPresence });

  useEffect(() => {
    callbacks.current = { onRoomUpdated, onRoomReset, onPresence };
  }, [onRoomUpdated, onRoomReset, onPresence]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (room: Room) => {
      callbacks.current.onRoomUpdated(room);
    };
    const handleRoomReset = () => {
      callbacks.current.onRoomReset();
    };
    const handlePresence = (payload: {
      roomCode?: unknown;
      players?: Array<{ telegramId: number; presence: "online" | "offline" }>;
    }) => callbacks.current.onPresence?.(payload);

    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:reset", handleRoomReset);
    socket.on("room:presence", handlePresence);
    return () => {
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:reset", handleRoomReset);
      socket.off("room:presence", handlePresence);
    };
  }, [socket]);
}
