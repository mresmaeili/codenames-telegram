import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  const socket = useMemo(() => getSocketClient(), []);
  const currentRoomCodeRef = useRef<string | null>(null);

  const refreshLobby = useCallback(async () => {
    if (!roomCode) {
      setLobbyState({ room: null, loading: false, error: null });
      return;
    }

    try {
      setLobbyState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const response = await fetch(`/api/rooms/${roomCode}`);
      if (!response.ok) {
        throw new Error(
          "This room could not be found. Please check the code and try again.",
        );
      }

      const room = (await response.json()) as Room;
      if (currentRoomCodeRef.current === roomCode) {
        setLobbyState({ room, loading: false, error: null });
      }
    } catch (error) {
      const message = getFriendlyLobbyMessage(error);
      if (currentRoomCodeRef.current === roomCode) {
        setLobbyState({ room: null, loading: false, error: message });
      }
    }
  }, [roomCode]);

  // Main effect: fetch room and listen for updates
  useEffect(() => {
    if (!roomCode) {
      setLobbyState({ room: null, loading: false, error: null });
      return;
    }

    let isMounted = true;
    currentRoomCodeRef.current = roomCode;

    void refreshLobby();

    // Handler for room updates from socket
    const handleRoomUpdated = () => {
      if (isMounted && currentRoomCodeRef.current === roomCode) {
        void refreshLobby();
      }
    };

    // Join room via socket and listen for updates
    if (socket && user) {
      socket.emit("room:join", {
        roomCode,
        telegramId: user.telegramId,
        displayName: user.firstName,
      });

      socket.on("room:updated", handleRoomUpdated);
    }

    // Cleanup: leave listener when room changes or component unmounts
    return () => {
      isMounted = false;
      if (socket) {
        socket.off("room:updated", handleRoomUpdated);
      }
    };
  }, [refreshLobby, roomCode, socket, user]);

  return {
    room: lobbyState.room,
    loading: lobbyState.loading,
    error: lobbyState.error,
    refreshLobby,
  };
}
