import type { CardColor, Turn } from "@/../shared/src/types/game";
import { useEffect, useRef } from "react";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { Icon } from "@/components/Icon";
import { isDevModeEnabled } from "@/lib/dev";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";

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
  ownerIds?: number[];
  timerDuration: number | null;
  secondsRemaining: number | null;
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
  ownerIds = [],
  timerDuration,
  secondsRemaining,
  className = "",
}: GameLogProps) {
  const previewEntries = entries;
  const previewTimerDuration =
    timerDuration ?? (isDevModeEnabled() ? 90 : null);
  const previewSecondsRemaining =
    secondsRemaining ?? (isDevModeEnabled() ? 58 : null);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const latestEntryId = previewEntries[previewEntries.length - 1]?.id ?? null;

  useEffect(() => {
    const scrollContainer = logScrollRef.current;
    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [latestEntryId, previewEntries.length]);

  return (
    <div
      className={`${className} flex h-[11.5rem] max-h-[11.5rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-[16px] border-2 border-[#15191c] bg-[linear-gradient(180deg,#45494d_0%,#202428_100%)] p-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_5px_12px_rgba(0,0,0,0.3)]`}
    >
      <div className="border-b border-white/10 pb-0.5 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-white/60">
        Game log
      </div>
      {previewTimerDuration && previewSecondsRemaining !== null ? (
        <div
          className={`mt-0.5 rounded-md border px-1 py-0 text-center ${previewSecondsRemaining < 0 ? "border-[#ff8f82] bg-[#b9362b] text-white" : "border-[#ffe39a] bg-[#d8b65c] text-[#20160b]"}`}
        >
          <div className="font-digital text-[clamp(0.7rem,2.5vw,0.85rem)] font-normal leading-none tracking-tight">
            {formatTimer(previewSecondsRemaining)}
          </div>
        </div>
      ) : null}
      <div
        ref={logScrollRef}
        className="game-log-scrollbar -mr-1.5 mt-1 min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-scroll overscroll-contain text-left text-[9px] text-white/80"
      >
        {previewEntries.length > 0 ? (
          groupRounds(previewEntries).map((round) => {
            const hintPlayer = players.find(
              (player) => player.userId === round.hint.playerId,
            );
            const teamColor =
              round.hint.team === "blue"
                ? {
                    avatar: "border-cyan-300",
                    name: "bg-[#08799f]",
                    accent: "border-l-[#159dce]",
                  }
                : {
                    avatar: "border-red-300",
                    name: "bg-[#9f3028]",
                    accent: "border-l-[#d66055]",
                  };

            return (
              <div
                key={round.hint.id}
                className="min-w-0 animate-event-in px-0 py-1"
              >
                <div
                  className={`game-log-hint-row game-log-hint-row-${round.hint.team} relative flex h-7 min-h-7 min-w-0 items-center gap-1 rounded-md border border-white/25 px-1 py-0.5 pl-7 shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${round.hint.team === "blue" ? "bg-[#159dce]" : "bg-[#d66055]"}`}
                >
                  <div className="absolute -left-1 top-1/2 z-10 flex h-7 w-8 -translate-y-1/2 items-center justify-center">
                    <span className="relative">
                      <img
                        src={avatarUrlForPlayer(hintPlayer)}
                        alt={hintPlayer?.displayName ?? round.hint.team}
                        title={hintPlayer?.displayName ?? round.hint.team}
                        className={`h-7 w-7 rounded-full border-2 object-cover ${teamColor.avatar}`}
                      />
                      <PlayerAdminBadge
                        isAdmin={ownerIds.includes(hintPlayer?.telegramId ?? 0)}
                      />
                    </span>
                    <span
                      className={`absolute top-full max-w-9 truncate rounded-sm px-0.5 text-[5px] font-normal leading-tight text-white ${teamColor.name}`}
                    >
                      {hintPlayer?.displayName ?? round.hint.team}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-0.5">
                    <span
                      dir="rtl"
                      lang="fa"
                      className="font-persian flex h-5 min-w-0 flex-1 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border-[3px] border-white/90 bg-white px-0.5 py-0 text-center text-[10px] font-bold uppercase leading-none text-[#15191c] shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
                    >
                      {round.hint.word}
                    </span>
                    <span className="font-persian flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-extrabold leading-none text-[#15191c] shadow-[0_2px_3px_rgba(0,0,0,0.3)]">
                      {round.hint.number}
                    </span>
                  </div>
                </div>
                {round.guesses.length > 0 || round.passes.length > 0 ? (
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-end justify-start gap-x-1.5 gap-y-1 pt-0.5">
                    {round.guesses.map((guess) => {
                      const guessPlayer = players.find(
                        (player) => player.userId === guess.playerId,
                      );
                      const guessColor =
                        guess.color === "blue"
                          ? "bg-[#08a6d0]"
                          : guess.color === "red"
                            ? "bg-[#d66055]"
                            : guess.color === "assassin"
                              ? "bg-[#252525]"
                              : "bg-[#767676]";
                      const guessNameColor =
                        guess.team === "blue" ? "bg-[#08799f]" : "bg-[#9f3028]";
                      return (
                        <div
                          key={guess.id}
                          className="relative flex min-w-0 max-w-[calc(50%-0.375rem)] shrink items-center"
                        >
                          <div className="relative z-10 -mr-1.5 translate-y-0.5 flex w-6 shrink-0 flex-col items-center">
                            <span className="relative">
                              <img
                                src={avatarUrlForPlayer(guessPlayer)}
                                alt={guessPlayer?.displayName ?? guess.team}
                                title={guessPlayer?.displayName ?? guess.team}
                                className="h-5 w-5 rounded-full border border-white/90 object-cover"
                              />
                              <PlayerAdminBadge
                                isAdmin={ownerIds.includes(
                                  guessPlayer?.telegramId ?? 0,
                                )}
                              />
                            </span>
                            <span
                              className={`-mt-px max-w-10 truncate rounded-sm px-0.5 text-[6px] font-semibold leading-none text-white ${guessNameColor}`}
                            >
                              {guessPlayer?.displayName ?? "Player"}
                            </span>
                          </div>
                          <span
                            dir="rtl"
                            lang="fa"
                            className={`font-persian min-w-0 whitespace-nowrap rounded-r-md border border-white/25 px-1.5 py-1 text-left text-[9px] font-bold uppercase leading-none text-white shadow-[0_2px_3px_rgba(0,0,0,0.25)] ${guessColor}`}
                          >
                            {guess.word}
                          </span>
                        </div>
                      );
                    })}
                    {round.passes.map((pass) => {
                      const passPlayer = players.find(
                        (player) => player.userId === pass.playerId,
                      );
                      const passNameColor =
                        pass.team === "blue" ? "bg-[#08799f]" : "bg-[#9f3028]";
                      return (
                        <div
                          key={pass.id}
                          className="relative flex shrink-0 items-center"
                        >
                          <div className="relative z-10 -mr-1.5 translate-y-0.5 flex w-6 shrink-0 flex-col items-center">
                            <span className="relative">
                              <img
                                src={avatarUrlForPlayer(passPlayer)}
                                alt={passPlayer?.displayName ?? pass.team}
                                title={passPlayer?.displayName ?? pass.team}
                                className="h-5 w-5 rounded-full border border-white/90 object-cover"
                              />
                              <PlayerAdminBadge
                                isAdmin={ownerIds.includes(
                                  passPlayer?.telegramId ?? 0,
                                )}
                              />
                            </span>
                            <span
                              className={`-mt-px max-w-10 truncate rounded-sm px-0.5 text-[6px] font-semibold leading-none text-white ${passNameColor}`}
                            >
                              {passPlayer?.displayName ?? "Player"}
                            </span>
                          </div>
                          <span
                            className="-ml-0.5 flex h-4 min-w-5 items-center justify-center rounded-r-sm border border-[#2b9d18] bg-[#51df20] px-0.5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
                            aria-label="Turn passed"
                          >
                            <Icon name="check" size={10} />
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
