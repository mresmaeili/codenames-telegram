import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
  showRevealedWord?: boolean;
  selected?: boolean;
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
  onClick,
}: SpymasterCardProps) {
  const tileStyle = tileStyles[color];
  const card = (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[7px] border-2 ${selected ? "border-[#76f21b] ring-4 ring-[#76f21b] shadow-[0_0_0_4px_rgba(118,242,27,0.3),0_10px_20px_rgba(0,0,0,0.38)]" : tileStyle.tile} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)] transition duration-200 ease-out ${revealed ? "opacity-90" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <div className="game-card-shell">
        {(!revealed || showRevealedWord) && (
          <span
            dir="rtl"
            lang="fa"
            className={`game-card-label font-persian ${tileStyle.label} text-[clamp(0.8rem,3vw,1.25rem)] font-bold uppercase leading-tight tracking-[0.01em]`}
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
      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
    >
      {card}
    </button>
  ) : (
    card
  );
}
