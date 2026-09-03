import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { Room } from "@/../shared/src/types/room";

interface UseRoomSocketSyncOptions {
  socket: Socket | null;
  onRoomUpdated: (room: Room) => void;
  onRoomReset: () => void;
}

export function useRoomSocketSync({
  socket,
  onRoomUpdated,
  onRoomReset,
}: UseRoomSocketSyncOptions): void {
  const callbacks = useRef({ onRoomUpdated, onRoomReset });

  useEffect(() => {
    callbacks.current = { onRoomUpdated, onRoomReset };
  }, [onRoomUpdated, onRoomReset]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (room: Room) => {
      callbacks.current.onRoomUpdated(room);
    };
    const handleRoomReset = () => {
      callbacks.current.onRoomReset();
    };

    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:reset", handleRoomReset);
    return () => {
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:reset", handleRoomReset);
    };
  }, [socket]);
}
