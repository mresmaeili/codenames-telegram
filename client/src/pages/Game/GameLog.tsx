import type { CardColor, Turn } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

export interface GameLogEntry {
  id: string;
  kind: "hint" | "reveal" | "pass";
  team: Turn;
  word: string;
  number?: number;
  playerId: string | null;
  correct?: boolean;
  color?: CardColor | null;
}

interface GameLogProps {
  entries: GameLogEntry[];
  players: Room["players"];
  timerDuration: number | null;
  secondsRemaining: number | null;
  timerProgress: number;
  className?: string;
}

interface GameLogRound {
  hint: GameLogEntry;
  guesses: GameLogEntry[];
  passes: GameLogEntry[];
}

function formatTimer(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const absoluteSeconds = Math.abs(seconds);
  const minutes = Math.floor(absoluteSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (absoluteSeconds % 60).toString().padStart(2, "0");
  return `${sign}${minutes}:${remainingSeconds}`;
}

function groupRounds(entries: GameLogEntry[]): GameLogRound[] {
  return entries.reduce<GameLogRound[]>((rounds, entry) => {
    if (entry.kind === "hint") {
      rounds.push({ hint: entry, guesses: [], passes: [] });
    } else if (rounds.length > 0) {
      if (entry.kind === "pass") {
        rounds[rounds.length - 1].passes.push(entry);
      } else {
        rounds[rounds.length - 1].guesses.push(entry);
      }
    }
    return rounds;
  }, []);
}

export function GameLog({
  entries,
  players,
  timerDuration,
  secondsRemaining,
  timerProgress,
  className = "",
}: GameLogProps) {
  return (
    <div
      className={`${className} h-full min-h-[18rem] overflow-y-auto rounded-[26px] bg-[#4a4a4a] p-3 text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)]`}
    >
      <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
        Game log
      </div>
      {timerDuration && secondsRemaining !== null ? (
        <div
          className={`mt-2 rounded-full px-2 py-1 text-center font-black ${secondsRemaining < 0 ? "bg-[#f15f4a] text-white" : "bg-[#f5cf70] text-[#20160b]"}`}
        >
          <div className="text-[clamp(1.35rem,5vw,2rem)] leading-none tracking-tight">
            {formatTimer(secondsRemaining)}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-white/85 transition-[width] duration-500"
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-2 space-y-2 text-left text-[10px] text-white/80">
        {entries.length > 0 ? (
          groupRounds(entries).map((round) => {
            const hintPlayer = players.find(
              (player) => player.userId === round.hint.playerId,
            );
            const teamColor =
              round.hint.team === "blue"
                ? {
                    border: "border-cyan-300",
                    badge: "bg-[#08a6d0]",
                    row: "bg-[#159dce]",
                  }
                : {
                    border: "border-red-300",
                    badge: "bg-[#d84c3e]",
                    row: "bg-[#c94b3b]",
                  };

            return (
              <div key={round.hint.id} className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <img
                    src={avatarUrlForPlayer(hintPlayer)}
                    alt={hintPlayer?.displayName ?? round.hint.team}
                    title={hintPlayer?.displayName ?? round.hint.team}
                    className={`h-7 w-7 shrink-0 rounded-full border-2 object-cover ${teamColor.border}`}
                  />
                  <span
                    className={`min-w-0 flex-1 truncate rounded-sm px-2 py-1 text-center text-[11px] font-black uppercase text-white ${teamColor.row}`}
                  >
                    {round.hint.word}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black ${teamColor.border}`}
                  >
                    {round.hint.number}
                  </span>
                </div>
                {round.guesses.length > 0 ? (
                  <div className="mt-1 flex min-w-0 items-center gap-1 overflow-x-auto pl-8">
                    {round.guesses.map((guess) => {
                      const guessPlayer = players.find(
                        (player) => player.userId === guess.playerId,
                      );
                      const guessColor =
                        guess.color === "blue"
                          ? "bg-[#08a6d0]"
                          : guess.color === "red"
                            ? "bg-[#f4513f]"
                            : guess.color === "assassin"
                              ? "bg-[#252525]"
                              : "bg-[#5a5a5a]";
                      return (
                        <div
                          key={guess.id}
                          className={`flex shrink-0 items-center gap-0.5 rounded-sm px-1 py-0.5 font-black text-white ${guessColor}`}
                        >
                          <img
                            src={avatarUrlForPlayer(guessPlayer)}
                            alt={guessPlayer?.displayName ?? guess.team}
                            title={guessPlayer?.displayName ?? guess.team}
                            className="h-5 w-5 rounded-full border border-white/80 object-cover"
                          />
                          <span className="max-w-16 truncate uppercase">
                            {guess.word}
                          </span>
                          <span
                            className={
                              guess.correct ? "text-lime-300" : "text-red-200"
                            }
                            aria-label={
                              guess.correct ? "Correct guess" : "Wrong guess"
                            }
                          >
                            {guess.correct ? "✓" : "×"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {round.passes.length > 0 ? (
                  <div className="mt-1 flex min-w-0 items-center gap-1 overflow-x-auto pl-8">
                    {round.passes.map((pass) => {
                      const passPlayer = players.find(
                        (player) => player.userId === pass.playerId,
                      );
                      return (
                        <div
                          key={pass.id}
                          className="flex shrink-0 items-center gap-1 rounded-sm bg-[#555] px-1 py-0.5 font-black text-white"
                        >
                          <img
                            src={avatarUrlForPlayer(passPlayer)}
                            alt={passPlayer?.displayName ?? pass.team}
                            title={passPlayer?.displayName ?? pass.team}
                            className="h-5 w-5 rounded-full border border-white/80 object-cover"
                          />
                          <span>Pass</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-lg bg-black/55 px-2 py-1.5 text-center">
            No hint yet
          </div>
        )}
      </div>
    </div>
  );
}
