import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { GameStateSnapshot } from "@/../shared/src/types/socket";
import { hydrateGameSnapshot } from "./gameSnapshot";

export function useGameStateSync(
  socket: Socket | null,
  onSnapshot: (snapshot: ReturnType<typeof hydrateGameSnapshot>) => void,
): void {
  const callbackRef = useRef(onSnapshot);

  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (snapshot: GameStateSnapshot) => {
      if (!snapshot?.game || !snapshot?.room) return;
      callbackRef.current(hydrateGameSnapshot(snapshot));
    };

    socket.on("game:state", handleState);
    return () => {
      socket.off("game:state", handleState);
    };
  }, [socket]);
}
