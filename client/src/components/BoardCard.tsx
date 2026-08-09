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
  red: "bg-red-500/95",
  blue: "bg-blue-500/95",
  neutral: "bg-[color:var(--app-surface)]/95",
  assassin: "bg-black/95",
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
  const outerClasses: string[] = [];
  if (selectedPlaceholder)
    outerClasses.push("ring-4 ring-[color:var(--app-accent)]");
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const tileColor = revealedColor
    ? tileBgStyles[revealedColor]
    : "bg-[color:var(--app-background)]";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-2xl ${tileColor} ${outerClasses.join(" ")} shadow-md transform-gpu transition duration-200 ease-out`}
    >
      <div className="absolute inset-3 rounded-lg bg-white/95 flex items-center justify-center px-3 py-2">
        <span
          className={`text-center font-extrabold tracking-wide text-sm sm:text-base text-(--app-text) ${hiddenWord ? "opacity-0" : "opacity-100"}`}
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
