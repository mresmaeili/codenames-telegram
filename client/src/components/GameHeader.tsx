import type { Room } from "@/../shared/src/types/room";

interface GameHeaderProps {
  room?: Room;
  game?: {
    currentTurn?: string;
    startingTeam?: string;
    remainingGuesses?: number;
    status?: string;
    winningTeam?: string | null;
    completionReason?: string | null;
  };
  playerCount?: number;
  compact?: boolean;
  title?: string;
}

export function GameHeader({
  room,
  game,
  playerCount,
  compact = false,
  title,
}: GameHeaderProps) {
  return (
    <div
      className={`rounded-4xl border border-[color:var(--app-border)] bg-[var(--app-background)] p-3 shadow-sm ${compact ? "max-w-md mx-auto" : "sm:p-5"}`}
    >
      {compact ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--app-text)]">
              {title ?? "Settings"}
            </h3>
            <div className="text-xs text-[color:var(--app-muted)]">
              {playerCount ? `${playerCount} players` : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
              {game?.currentTurn ?? "-"}
            </span>
            <span className="rounded-full bg-[color:var(--app-border)]/10 px-2 py-1 text-xs text-[color:var(--app-muted)]">
              Starts: {game?.startingTeam ?? "-"}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--app-muted)]">
                Game status
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-500 px-3 py-2 text-sm font-semibold text-white">
                  {game?.currentTurn} team
                </span>
                <span className="rounded-full bg-[color:var(--app-border)]/10 px-3 py-2 text-sm text-[color:var(--app-muted)]">
                  Starts: {game?.startingTeam}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-max items-center">
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[color:var(--app-text)]">
                {playerCount} players
              </div>
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[color:var(--app-text)]">
                {game?.remainingGuesses} guesses
              </div>
              <div
                className={`rounded-3xl px-3 py-2 text-sm ${
                  game?.status === "finished"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-muted)]"
                }`}
              >
                {game?.status}
              </div>
              {game?.winningTeam ? (
                <div className="rounded-3xl bg-[var(--app-accent)]/10 px-3 py-2 text-sm font-semibold text-[color:var(--app-text)]">
                  Winner: {game?.winningTeam}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <form className="w-full max-w-lg">
              <div className="flex items-center gap-3">
                <input
                  className="w-full rounded-full border border-[color:var(--app-border)] px-4 py-3 text-lg font-semibold text-[color:var(--app-text)] placeholder-[color:var(--app-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)]"
                  placeholder="Enter hint and number"
                  aria-label="Hint input"
                />
                <button className="rounded-full bg-[var(--app-accent)] px-4 py-3 text-sm font-semibold text-white">
                  Give
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
