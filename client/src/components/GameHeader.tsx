import type { Room } from "@/../shared/src/types/room";

interface GameHeaderProps {
  room: Room;
  game: {
    currentTurn: string;
    startingTeam: string;
    remainingGuesses: number;
    status: string;
    winningTeam?: string | null;
    completionReason?: string | null;
  };
  playerCount: number;
}

export function GameHeader({ room, game, playerCount }: GameHeaderProps) {
  return (
    <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
            Game board
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-(--app-text)">
            Room {room.roomCode}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
            Turn: {game.currentTurn}
          </span>
          <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
            Start: {game.startingTeam}
          </span>
          <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
            Guesses: {game.remainingGuesses}
          </span>
          <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
            Status: {game.status}
          </span>
          {game.winningTeam ? (
            <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
              Winner: {game.winningTeam}
            </span>
          ) : null}
          <span className="rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-muted)">
            Players: {playerCount}
          </span>
        </div>
      </div>
    </div>
  );
}
