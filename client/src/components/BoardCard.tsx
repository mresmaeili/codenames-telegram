import type { CardColor } from "@/../shared/src/types/game";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
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
}: BoardCardProps) {
  const visualState = selectedPlaceholder
    ? "border-(--app-accent) bg-(--app-accent)/15"
    : revealedColor
      ? colorStyles[revealedColor]
      : revealPlaceholder
        ? "border-(--app-border) bg-(--app-background) opacity-70"
        : "border-(--app-border) bg-(--app-background)";

  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-medium text-(--app-text) shadow-sm ${visualState} ${disabled ? "opacity-70" : ""}`}
    >
      {word}
    </div>
  );
}
