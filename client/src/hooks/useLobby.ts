import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getFriendlyLobbyMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load this lobby. Please try again in a moment.";
}

import { useAuthContext } from "@/context/AuthContext";
import { apiUrl } from "@/config/env";
import { getSocketClient } from "@/socket/client";
import { useAppState } from "@/state/AppStateContext";
import {
  setRoomCode,
  setRoomData,
  setRoomError,
  setRoomLoading,
  setRoomPresence,
} from "@/state/appActions";
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
  const { dispatch } = useAppState();
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    room: null,
    loading: Boolean(roomCode),
    error: null,
  });

  const socket = useMemo(() => getSocketClient(), []);
  const currentRoomCodeRef = useRef<string | null>(null);

  const refreshLobby = useCallback(
    async (showLoading = true) => {
      if (!roomCode) {
        setLobbyState({ room: null, loading: false, error: null });
        dispatch(setRoomCode(null));
        dispatch(setRoomData(null));
        dispatch(setRoomLoading(false));
        dispatch(setRoomError(null));
        return;
      }

      try {
        if (showLoading) {
          setLobbyState((current) => ({
            ...current,
            loading: true,
            error: null,
          }));
          dispatch(setRoomLoading(true));
          dispatch(setRoomError(null));
        }

        const response = await fetch(apiUrl(`/api/rooms/${roomCode}`));
        if (!response.ok) {
          throw new Error(
            "This room could not be found. Please check the code and try again.",
          );
        }

        const room = (await response.json()) as Room;
        if (currentRoomCodeRef.current === roomCode) {
          setLobbyState({ room, loading: false, error: null });
          dispatch(setRoomCode(roomCode));
          dispatch(setRoomData(room));
          dispatch(setRoomLoading(false));
          dispatch(setRoomError(null));
        }
      } catch (error) {
        const message = getFriendlyLobbyMessage(error);
        if (currentRoomCodeRef.current === roomCode) {
          setLobbyState({ room: null, loading: false, error: message });
          dispatch(setRoomCode(roomCode));
          dispatch(setRoomData(null));
          dispatch(setRoomLoading(false));
          dispatch(setRoomError(message));
        }
      }
    },
    [dispatch, roomCode],
  );

  // Main effect: fetch room and listen for updates
  useEffect(() => {
    if (!roomCode) {
      setLobbyState({ room: null, loading: false, error: null });
      dispatch(setRoomCode(null));
      dispatch(setRoomData(null));
      dispatch(setRoomLoading(false));
      dispatch(setRoomError(null));
      return;
    }

    dispatch(setRoomCode(roomCode));

    let isMounted = true;
    currentRoomCodeRef.current = roomCode;

    void refreshLobby();

    // Handler for room updates from socket
    const handleRoomUpdated = () => {
      if (isMounted && currentRoomCodeRef.current === roomCode) {
        void refreshLobby(false);
      }
    };

    const handlePresence = (payload: {
      roomCode?: unknown;
      players?: Array<{ telegramId: number; presence: "online" | "offline" }>;
    }) => {
      if (
        !isMounted ||
        currentRoomCodeRef.current !== roomCode ||
        !Array.isArray(payload.players)
      ) {
        return;
      }

      const presenceByPlayer = new Map(
        payload.players.map((player) => [player.telegramId, player.presence]),
      );
      setLobbyState((current) =>
        current.room
          ? {
              ...current,
              room: {
                ...current.room,
                players: current.room.players.map((player) => ({
                  ...player,
                  presence: presenceByPlayer.get(player.telegramId) ?? "away",
                })),
              },
            }
          : current,
      );

      const nextPresence = Object.fromEntries(
        Array.from(presenceByPlayer.entries()).map(([telegramId, status]) => [
          Number(telegramId),
          status,
        ]),
      ) as Record<number, "online" | "offline" | "away">;
      dispatch(setRoomPresence(nextPresence));
    };

    const joinRoomSocket = () => {
      if (!socket || !user || !isMounted) {
        return;
      }

      socket.emit("room:join", {
        roomCode,
        telegramId: user.telegramId,
        displayName: user.firstName,
        avatarId: user.avatarId ?? undefined,
      });
    };

    // Join room via socket and rejoin after transient reconnects.
    if (socket && user) {
      joinRoomSocket();
      socket.on("connect", joinRoomSocket);
      socket.on("connected", joinRoomSocket);
      socket.on("room:updated", handleRoomUpdated);
      socket.on("room:presence", handlePresence);
    }

    // Cleanup: leave listener when room changes or component unmounts
    return () => {
      isMounted = false;
      if (socket) {
        socket.off("connect", joinRoomSocket);
        socket.off("connected", joinRoomSocket);
        socket.off("room:updated", handleRoomUpdated);
        socket.off("room:presence", handlePresence);
      }
    };
  }, [dispatch, refreshLobby, roomCode, socket, user]);

  return {
    room: lobbyState.room,
    loading: lobbyState.loading,
    error: lobbyState.error,
    refreshLobby,
  };
}
