import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { GameStateSnapshot } from "@/../shared/src/types/socket";
import { hydrateGameSnapshot } from "./gameSnapshot";

export function useGameStateSync(
  socket: Socket | null,
  onSnapshot: (snapshot: ReturnType<typeof hydrateGameSnapshot>) => void,
  onSelectionChanged?: (selection: {
    cardId: string;
    playerId: string;
    selected: boolean;
  }) => void,
): void {
  const callbackRef = useRef({ onSnapshot, onSelectionChanged });

  useEffect(() => {
    callbackRef.current = { onSnapshot, onSelectionChanged };
  }, [onSnapshot, onSelectionChanged]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (snapshot: GameStateSnapshot) => {
      if (!snapshot?.game || !snapshot?.room) return;
      callbackRef.current.onSnapshot(hydrateGameSnapshot(snapshot));
    };
    const handleSelection = (selection: {
      cardId?: unknown;
      playerId?: unknown;
      selected?: unknown;
    }) => {
      if (
        typeof selection?.cardId !== "string" ||
        typeof selection.playerId !== "string" ||
        typeof selection.selected !== "boolean"
      ) {
        return;
      }
      callbackRef.current.onSelectionChanged?.({
        cardId: selection.cardId,
        playerId: selection.playerId,
        selected: selection.selected,
      });
    };

    socket.on("game:state", handleState);
    socket.on("game:selection", handleSelection);
    return () => {
      socket.off("game:state", handleState);
      socket.off("game:selection", handleSelection);
    };
  }, [socket]);
}
