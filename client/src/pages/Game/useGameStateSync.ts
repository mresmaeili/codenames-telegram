import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { GameStateSnapshot } from "@/../shared/src/types/socket";
import { hydrateGameSnapshot } from "./gameSnapshot";
import { shouldApplyGameState } from "./stateVersion";

export function useGameStateSync(
  socket: Socket | null,
  onSnapshot: (snapshot: ReturnType<typeof hydrateGameSnapshot>) => void,
  onSelectionChanged?: (selection: {
    gameId: string;
    stateVersion: number;
    cardId: string;
    playerId: string;
    selected: boolean;
  }) => void,
): void {
  const callbackRef = useRef({ onSnapshot, onSelectionChanged });
  const latestVersionRef = useRef<{
    gameId: string | undefined;
    version: number;
  }>({ gameId: undefined, version: -1 });

  useEffect(() => {
    callbackRef.current = { onSnapshot, onSelectionChanged };
  }, [onSnapshot, onSelectionChanged]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (snapshot: GameStateSnapshot) => {
      if (!snapshot?.game || !snapshot?.room) return;
      const gameId = snapshot.game.id ?? snapshot.game.roomId;
      const stateVersion = snapshot.game.stateVersion ?? 0;
      const latest = latestVersionRef.current;
      if (
        !shouldApplyGameState(
          { gameId: latest.gameId ?? gameId, stateVersion: latest.version },
          { gameId, stateVersion },
        )
      ) {
        return;
      }
      if (latest.gameId !== gameId) {
        latestVersionRef.current = { gameId, version: stateVersion };
      } else {
        latest.version = stateVersion;
      }
      callbackRef.current.onSnapshot(hydrateGameSnapshot(snapshot));
    };
    const handleSelection = (selection: {
      gameId?: unknown;
      stateVersion?: unknown;
      cardId?: unknown;
      playerId?: unknown;
      selected?: unknown;
    }) => {
      if (
        typeof selection?.gameId !== "string" ||
        typeof selection?.stateVersion !== "number" ||
        typeof selection?.cardId !== "string" ||
        typeof selection.playerId !== "string" ||
        typeof selection.selected !== "boolean"
      ) {
        return;
      }
      const latest = latestVersionRef.current;
      if (
        !shouldApplyGameState(
          {
            gameId: latest.gameId ?? selection.gameId,
            stateVersion: latest.version,
          },
          {
            gameId: selection.gameId,
            stateVersion: selection.stateVersion,
          },
        )
      ) {
        return;
      }
      latestVersionRef.current = {
        gameId: selection.gameId,
        version: selection.stateVersion,
      };
      callbackRef.current.onSelectionChanged?.({
        gameId: selection.gameId,
        stateVersion: selection.stateVersion,
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
