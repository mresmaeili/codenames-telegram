import type { Turn } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

export interface GameLogEntry {
  id: string;
  kind: "hint" | "reveal";
  team: Turn;
  word: string;
  number?: number;
  playerId: string | null;
  correct?: boolean;
}

interface GameLogProps {
  entries: GameLogEntry[];
  players: Room["players"];
  timerDuration: number | null;
  secondsRemaining: number | null;
  timerProgress: number;
  isSpymaster: boolean;
}

interface GameLogRound {
  hint: GameLogEntry;
  guesses: GameLogEntry[];
}

function groupRounds(entries: GameLogEntry[]): GameLogRound[] {
  return entries.reduce<GameLogRound[]>((rounds, entry) => {
    if (entry.kind === "hint") rounds.push({ hint: entry, guesses: [] });
    else if (rounds.length > 0) rounds[rounds.length - 1].guesses.push(entry);
    return rounds;
  }, []);
}

export function GameLog({
  entries,
  players,
  timerDuration,
  secondsRemaining,
  timerProgress,
  isSpymaster,
}: GameLogProps) {
  return (
    <div className="col-start-2 row-span-2 row-start-1 h-53 overflow-y-auto rounded-xl border-2 border-[#777] bg-[#3e3e3e] p-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
      <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
        Game log
      </div>
      {timerDuration && secondsRemaining !== null ? (
        <div className="mt-1 rounded-full bg-[#bfeff5] px-2 py-0.5 text-center text-sm font-black text-[#17212b]">
          {isSpymaster ? "SPYMASTER " : "OPERATIVES "}
          {Math.floor(secondsRemaining / 60)
            .toString()
            .padStart(2, "0")}
          :
          {Math.floor(secondsRemaining % 60)
            .toString()
            .padStart(2, "0")}
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[#3e8290]">
            <div
              className="h-full rounded-full bg-[#27b9d1] transition-[width] duration-500"
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
                      return (
                        <div
                          key={guess.id}
                          className={`flex shrink-0 items-center gap-0.5 rounded-sm px-1 py-0.5 font-black text-white ${teamColor.badge}`}
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
