export interface GameStateVersion {
  gameId: string;
  stateVersion: number;
}

export function shouldApplyGameState(
  latest: GameStateVersion,
  incoming: GameStateVersion,
): boolean {
  return (
    latest.gameId !== incoming.gameId ||
    incoming.stateVersion >= latest.stateVersion
  );
}
