import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
  showRevealedWord?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const tileBgStyles: Record<CardColor, string> = {
  red: "bg-[#f4513f]",
  blue: "bg-[#08a6d0]",
  neutral: "bg-[#5a5a5a]",
  assassin: "bg-[#252525]",
};

export function SpymasterCard({
  word,
  color,
  revealed = false,
  showRevealedWord = false,
  selected = false,
  onClick,
}: SpymasterCardProps) {
  const tileColor = tileBgStyles[color] ?? "bg-(--app-surface)";
  const card = (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[5px] border-2 ${selected ? "border-[#76f21b] ring-4 ring-[#76f21b] shadow-[0_0_0_4px_rgba(118,242,27,0.3),0_10px_20px_rgba(0,0,0,0.38)]" : "border-[#0a6e9f]"} ${tileColor} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)] transition duration-200 ease-out ${revealed ? "opacity-90" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <div className="absolute inset-x-1.25 bottom-1.25 flex min-h-[46%] items-center justify-center rounded-[3px] border border-black/15 bg-[#fffaf2] p-1 text-center shadow-[0_-2px_4px_rgba(0,0,0,0.18)]">
        {(!revealed || showRevealedWord) && (
          <span className="font-persian block px-1 text-center wrap-break-word whitespace-normal text-[clamp(0.72rem,2.8vw,1.15rem)] uppercase leading-none tracking-[0.01em] text-[#111820]">
            {word}
          </span>
        )}
      </div>
      {selected ? (
        <span
          className="absolute -right-1 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4cdf25] text-lg leading-none text-white shadow-[0_2px_5px_rgba(0,0,0,0.45)]"
          aria-hidden="true"
        >
          ☝
        </span>
      ) : null}
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
