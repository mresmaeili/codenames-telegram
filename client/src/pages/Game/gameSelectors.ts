import type { GameView, Turn } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";

type ViewerPlayer = Room["players"][number] | null | undefined;

export function hasActiveHint(game: GameView | null): boolean {
  return Boolean(
    game && (game.currentHintWord !== null || game.currentHintNumber !== null),
  );
}

export function isActiveRole(
  game: GameView | null,
  viewerPlayer: ViewerPlayer,
  role: "operative" | "spymaster",
): boolean {
  return Boolean(
    viewerPlayer &&
    game &&
    viewerPlayer.team === game.currentTurn &&
    game.role === role &&
    game.status === "active",
  );
}

export function canSubmitHint(
  game: GameView | null,
  viewerPlayer: ViewerPlayer,
): boolean {
  return isActiveRole(game, viewerPlayer, "spymaster") && !hasActiveHint(game);
}

export function canSelectCard(
  game: GameView | null,
  viewerPlayer: ViewerPlayer,
): boolean {
  return Boolean(
    isActiveRole(game, viewerPlayer, "operative") &&
    game?.currentHintWord &&
    game.currentHintNumber !== null &&
    game.remainingGuesses > 0,
  );
}

export function canPassTurn(
  game: GameView | null,
  viewerPlayer: ViewerPlayer,
  timerExpired: boolean,
): boolean {
  if (!game || game.status !== "active") return false;
  if (timerExpired) {
    const opposingTeam: Turn = game.currentTurn === "red" ? "blue" : "red";
    return (
      viewerPlayer?.team === game.currentTurn ||
      viewerPlayer?.team === opposingTeam
    );
  }
  return isActiveRole(game, viewerPlayer, "operative") && hasActiveHint(game);
}

export function canTakeTurn(
  game: GameView | null,
  viewerPlayer: ViewerPlayer,
  timerExpired: boolean,
): boolean {
  if (!game || game.status !== "active" || !timerExpired) return false;
  const opposingTeam: Turn = game.currentTurn === "red" ? "blue" : "red";
  return viewerPlayer?.team === opposingTeam;
}
