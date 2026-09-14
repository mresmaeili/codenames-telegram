import type { CardColor } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";
import { PlayerPresenceDot } from "@/components/PlayerPresenceDot";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
  showRevealedWord?: boolean;
  selected?: boolean;
  selectedPlayers?: Room["players"];
  ownerIds?: number[];
  onClick?: () => void;
}

const tileStyles: Record<CardColor, { tile: string; label: string }> = {
  red: { tile: "game-card-tile-red", label: "game-card-label-red" },
  blue: { tile: "game-card-tile-blue", label: "game-card-label-blue" },
  neutral: {
    tile: "game-card-tile-neutral",
    label: "game-card-label-neutral",
  },
  assassin: {
    tile: "game-card-tile-assassin",
    label: "game-card-label-assassin",
  },
};

export function SpymasterCard({
  word,
  color,
  revealed = false,
  showRevealedWord = false,
  selected = false,
  selectedPlayers = [],
  ownerIds = [],
  onClick,
}: SpymasterCardProps) {
  const tileStyle = tileStyles[color];
  const wordLengthClass =
    word.length >= 14
      ? "text-[clamp(0.52rem,1.9vw,0.76rem)]"
      : word.length >= 11
        ? "text-[clamp(0.62rem,2.25vw,0.9rem)]"
        : word.length >= 8
          ? "text-[clamp(0.7rem,2.6vw,1rem)]"
          : "text-[clamp(0.8rem,3vw,1.25rem)]";
  const card = (
    <div
      className={`game-card-surface relative flex aspect-square items-center justify-center rounded-[7px] border ${selected ? "border-[#76f21b] ring-4 ring-[#76f21b] shadow-[0_0_0_4px_rgba(118,242,27,0.3),0_10px_20px_rgba(0,0,0,0.38)]" : tileStyle.tile} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)] transition duration-200 ease-out ${revealed ? "opacity-90 animate-flip-card" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <div className="game-card-shell">
        {selectedPlayers.length > 0 ? (
          <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center">
            {selectedPlayers.length === 1 ? (
              <div className="relative flex min-w-0 items-center gap-0.5 rounded-full bg-[#4cdf25] pr-1 text-[0.55rem] font-bold leading-none text-[#123d08] shadow-[0_2px_5px_rgba(0,0,0,0.45)]">
                <span className="relative shrink-0">
                  <img
                    src={avatarUrlForPlayer(selectedPlayers[0])}
                    alt={
                      selectedPlayers[0]?.displayName ?? "Selected by player"
                    }
                    title={selectedPlayers[0]?.displayName}
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                  />
                  <PlayerPresenceDot
                    player={selectedPlayers[0]}
                    className="border-white"
                  />
                  <PlayerAdminBadge
                    isAdmin={ownerIds.includes(
                      selectedPlayers[0]?.telegramId ?? 0,
                    )}
                  />
                </span>
                <span className="max-w-14 truncate">
                  {selectedPlayers[0]?.displayName ?? "Player"}
                </span>
              </div>
            ) : (
              <span
                className="relative flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#4cdf25] px-1 text-[0.65rem] font-black leading-none text-[#123d08] shadow-[0_2px_5px_rgba(0,0,0,0.45)]"
                aria-label={`${selectedPlayers.length} operatives selected this card`}
              >
                {selectedPlayers.length}
              </span>
            )}
          </div>
        ) : null}
        {(!revealed || showRevealedWord) && (
          <span
            dir="rtl"
            lang="fa"
            className={`game-card-label max-w-full whitespace-nowrap text-center font-persian ${tileStyle.label} ${wordLengthClass} overflow-hidden font-bold uppercase leading-[1.05] tracking-[0.01em]`}
          >
            {word}
          </span>
        )}
      </div>
    </div>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        revealed
          ? `${showRevealedWord ? "Hide" : "Show"} ${word}`
          : `${selected ? "Remove" : "Add"} ${word} to hint count`
      }
      className="group block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
    >
      {card}
    </button>
  ) : (
    card
  );
}
