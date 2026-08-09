import type { CardColor } from "@/../shared/src/types/game";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
  hideWord?: boolean;
}

const colorStyles: Record<CardColor, string> = {
  red: "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  neutral: "border-(--app-border) bg-(--app-background) text-(--app-text)",
  assassin: "border-black bg-black/80 text-white",
};

export function BoardCard({
  word,
  disabled = false,
  revealPlaceholder = false,
  selectedPlaceholder = false,
  revealedColor = null,
  hideWord = false,
}: BoardCardProps) {
  const visualState = selectedPlaceholder
    ? "border-(--app-accent) bg-(--app-accent)/15"
    : revealedColor
      ? colorStyles[revealedColor]
      : revealPlaceholder
        ? "border-(--app-border) bg-(--app-background) opacity-70"
        : "border-(--app-border) bg-(--app-background)";

  const revealAnimation = revealedColor ? "scale-105 shadow-lg" : "scale-100";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-medium text-(--app-text) shadow-sm overflow-hidden transform-gpu transition-all duration-300 ease-out ${visualState} ${revealAnimation} ${disabled ? "opacity-70" : ""}`}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${hideWord && !revealedColor && !selectedPlaceholder ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        aria-hidden={true}
      >
        ••••
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${hideWord && !revealedColor && !selectedPlaceholder ? "opacity-0 scale-95" : "opacity-100 scale-100"} ${revealedColor ? "animate-reveal-card" : ""}`}
      >
        {word}
      </span>
    </div>
  );
}
