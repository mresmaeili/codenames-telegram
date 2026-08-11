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
  neutral: "bg-(--app-surface)/95",
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
  const outerClasses: string[] = ["shadow-lg"];
  if (selectedPlaceholder) outerClasses.push("ring-4 ring-(--app-accent)");
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const tileColor = revealedColor
    ? tileBgStyles[revealedColor]
    : "bg-(--app-background)";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-3xl ${tileColor} ${outerClasses.join(" ")} transform-gpu transition duration-200 ease-out`}
    >
      <div className="absolute inset-3 rounded-2xl bg-white/95 p-3 flex items-center justify-center text-center">
        <span
          className={`block font-extrabold uppercase tracking-[0.2em] text-sm leading-tight text-(--app-text) ${hiddenWord ? "opacity-0" : "opacity-100"}`}
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
