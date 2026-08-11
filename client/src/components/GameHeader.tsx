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
      className={`rounded-4xl border border-(--app-border) bg-(--app-background) p-4 shadow-sm ${compact ? "max-w-md mx-auto" : "sm:p-5"}`}
    >
      {compact ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--app-text)">
              {title ?? "Settings"}
            </h3>
            <div className="text-xs text-(--app-muted)">
              {playerCount ? `${playerCount} players` : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
              {game?.currentTurn ?? "-"}
            </span>
            <span className="rounded-full bg-(--app-border)/10 px-2 py-1 text-xs text-(--app-muted)">
              Starts: {game?.startingTeam ?? "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-(--app-muted)">
                Game status
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-500 px-3 py-2 text-sm font-semibold text-white">
                  {game?.currentTurn ?? "-"} team
                </span>
                <span className="rounded-full bg-(--app-border)/10 px-3 py-2 text-sm text-(--app-muted)">
                  Starts: {game?.startingTeam ?? "-"}
                </span>
                <span className="rounded-full bg-(--app-border)/10 px-3 py-2 text-sm text-(--app-muted)">
                  {game?.remainingGuesses ?? 0} guesses
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) px-3 py-3 text-sm text-(--app-text)">
                {playerCount} players
              </div>
              <div className={`rounded-3xl px-3 py-3 text-sm ${game?.status === "finished" ? "bg-emerald-500/10 text-emerald-100" : "border border-(--app-border) bg-(--app-surface) text-(--app-muted)"}`}>
                {game?.status}
              </div>
              {game?.winningTeam ? (
                <div className="rounded-3xl bg-(--app-accent)/10 px-3 py-3 text-sm font-semibold text-(--app-text)">
                  Winner: {game.winningTeam}
                </div>
              ) : null}
            </div>
          </div>

          {title ? (
            <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm text-(--app-text)">
              <p className="font-semibold">{title}</p>
              {playerCount ? (
                <p className="mt-2 text-xs text-(--app-muted)">{playerCount} players</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
