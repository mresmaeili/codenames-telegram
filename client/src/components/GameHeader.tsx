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
    <div className="rounded-4xl border border-(--app-border) bg-(--app-background) p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-(--app-muted)">
            Game status
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-(--app-surface) px-3 py-2 text-sm font-semibold text-(--app-text)">
              {game.currentTurn} team
            </span>
            <span className="rounded-full bg-(--app-border)/10 px-3 py-2 text-sm text-(--app-muted)">
              Starts: {game.startingTeam}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-max">
          <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text)">
            {playerCount} players
          </div>
          <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text)">
            {game.remainingGuesses} guesses
          </div>
          <div
            className={`rounded-3xl px-3 py-2 text-sm ${
              game.status === "finished"
                ? "bg-emerald-500/10 text-emerald-300"
                : "border border-(--app-border) bg-(--app-surface) text-(--app-muted)"
            }`}
          >
            {game.status}
          </div>
          {game.winningTeam ? (
            <div className="rounded-3xl bg-(--app-accent)/10 px-3 py-2 text-sm font-semibold text-(--app-text)">
              Winner: {game.winningTeam}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
