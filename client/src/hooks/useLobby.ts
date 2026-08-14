import { useEffect, useMemo, useRef, useState } from "react";

function getFriendlyLobbyMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load this lobby. Please try again in a moment.";
}

import { useAuthContext } from "@/context/AuthContext";
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
  const { user } = useAuthContext();
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    room: null,
    loading: Boolean(roomCode),
    error: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const listenerRegisteredRef = useRef(false);

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

    function handleRoomUpdated(room: Room) {
      if (isMounted) {
        setLobbyState((current) => ({ ...current, room, error: null }));
      }
    }

    if (socket && user && !listenerRegisteredRef.current) {
      // Join room on socket
      socket.emit("room:join", {
        roomCode,
        telegramId: user.telegramId,
        displayName: user.firstName,
      });

      // Register listener only once
      socket.on("room:updated", handleRoomUpdated);
      listenerRegisteredRef.current = true;
    }

    return () => {
      isMounted = false;
    };
  }, [roomCode, socket, user, refreshKey]);

  // Separate effect to clean up the socket listener when component unmounts
  useEffect(() => {
    return () => {
      if (socket && listenerRegisteredRef.current) {
        socket.off("room:updated");
        listenerRegisteredRef.current = false;
      }
    };
  }, [socket]);

  return {
    room: lobbyState.room,
    loading: lobbyState.loading,
    error: lobbyState.error,
    refreshLobby: () => setRefreshKey((current) => current + 1),
  };
}
