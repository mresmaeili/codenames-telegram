import type { CardColor } from "@/../shared/src/types/game";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
  hideWord?: boolean;
}

const tileBgStyles: Record<CardColor, string> = {
  red: "bg-[#f4513f]",
  blue: "bg-[#08a6d0]",
  neutral: "bg-[#5a5a5a]",
  assassin: "bg-[#252525]",
};

export function BoardCard({
  word,
  disabled = false,
  revealPlaceholder = false,
  selectedPlaceholder = false,
  revealedColor = null,
  hideWord = false,
}: BoardCardProps) {
  const hiddenWord = hideWord && !revealedColor && !selectedPlaceholder;
  const outerClasses: string[] = [
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
  ];
  if (selectedPlaceholder) outerClasses.push("ring-2 ring-(--app-accent)");
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const tileColor = revealedColor
    ? tileBgStyles[revealedColor]
    : "bg-[#f5cda9]";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[5px] border-2 border-[#0a6e9f] ${tileColor} ${outerClasses.join(" ")} transform-gpu transition duration-200 ease-out`}
    >
      <div className="absolute inset-[5px] flex items-center justify-center rounded-[2px] border border-black/15 bg-[#fffaf2] p-1 text-center">
        <span
          className={`block font-black uppercase tracking-[0.01em] text-[clamp(0.72rem,2.8vw,1.15rem)] leading-none text-[#111820] ${hiddenWord ? "opacity-0" : "opacity-100"}`}
        >
          {word}
        </span>
      </div>

      {hiddenWord ? (
        <span className="absolute inset-0 flex items-center justify-center text-xl text-(--app-muted)">
          ••••
        </span>
      ) : null}
    </div>
  );
}
