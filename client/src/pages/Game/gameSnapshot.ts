import type { GameView } from "@/../shared/src/types/game";
import type { GameStateSnapshot } from "@/../shared/src/types/socket";

export function hydrateGameSnapshot(snapshot: GameStateSnapshot): {
  room: GameStateSnapshot["room"];
  game: GameView;
} {
  const game = {
    ...snapshot.game,
    createdAt: new Date(snapshot.game.createdAt),
    updatedAt: new Date(snapshot.game.updatedAt),
    hintSubmittedAt: snapshot.game.hintSubmittedAt
      ? new Date(snapshot.game.hintSubmittedAt)
      : null,
    phaseStartedAt: snapshot.game.phaseStartedAt
      ? new Date(snapshot.game.phaseStartedAt)
      : null,
    turnStartedAt: snapshot.game.turnStartedAt
      ? new Date(snapshot.game.turnStartedAt)
      : null,
    selectedAt: snapshot.game.selectedAt
      ? new Date(snapshot.game.selectedAt)
      : null,
    completedAt: snapshot.game.completedAt
      ? new Date(snapshot.game.completedAt)
      : null,
    hintHistory: snapshot.game.hintHistory.map((hint) => ({
      ...hint,
      submittedAt: new Date(hint.submittedAt),
    })),
  } as GameView;

  return { room: snapshot.room, game };
}
