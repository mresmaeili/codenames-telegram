import { useEffect, useMemo, useState } from "react";

function getFriendlyLobbyMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load this lobby. Please try again in a moment.";
}

import { getSocketClient } from "@/socket/client";
import type {
  Room,
  RoomPlayer,
  RoomStatus,
} from "../../../shared/src/types/room";

interface LobbyState {
  room: Room | null;
  loading: boolean;
  error: string | null;
}

interface LobbyHookOptions {
  roomCode: string | null;
}

export function useLobby({ roomCode }: LobbyHookOptions) {
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    room: null,
    loading: Boolean(roomCode),
    error: null,
  });

  const socket = useMemo(() => getSocketClient(), []);

  useEffect(() => {
    if (!roomCode) {
      setLobbyState({ room: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    async function fetchRoom() {
      try {
        const response = await fetch(`/api/rooms/${roomCode}`);
        if (!response.ok) {
          throw new Error(
            "This room could not be found. Please check the code and try again.",
          );
        }

        const room = (await response.json()) as Room;
        if (isMounted) {
          setLobbyState({ room, loading: false, error: null });
        }
      } catch (error) {
        const message = getFriendlyLobbyMessage(error);
        if (isMounted) {
          setLobbyState({ room: null, loading: false, error: message });
        }
      }
    }

    void fetchRoom();

    if (socket) {
      socket.on("room:updated", (room: Room) => {
        if (isMounted) {
          setLobbyState((current) => ({ ...current, room, error: null }));
        }
      });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off("room:updated");
      }
    };
  }, [roomCode, socket]);

  return lobbyState;
}
