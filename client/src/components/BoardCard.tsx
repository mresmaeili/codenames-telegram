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
  neutral:
    "border-[color:var(--app-border)] bg-[color:var(--app-background)] text-[color:var(--app-text)]",
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
    ? "border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/15 text-[color:var(--app-text)] shadow-[0_16px_36px_-24px_rgba(96,165,250,0.9)]"
    : revealedColor
      ? colorStyles[revealedColor]
      : revealPlaceholder
        ? "border-[color:var(--app-border)] bg-[color:var(--app-background)] opacity-80"
        : "border-[color:var(--app-border)] bg-[color:var(--app-background)]";

  const revealAnimation = revealedColor ? "scale-105 shadow-lg" : "scale-100";
  const hiddenWord = hideWord && !revealedColor && !selectedPlaceholder;

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-3xl border px-3 py-4 text-center text-sm font-semibold text-(--app-text) shadow-sm overflow-hidden transform-gpu transition duration-200 ease-out ${visualState} ${revealAnimation} ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center text-xl text-(--app-muted) transition duration-200 ease-out ${hiddenWord ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        aria-hidden="true"
      >
        ••••
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center px-3 transition duration-200 ease-out ${hiddenWord ? "opacity-0 scale-95" : "opacity-100 scale-100"} ${revealedColor ? "animate-reveal-card" : ""}`}
      >
        <span className="px-2 text-center wrap-break-word whitespace-normal leading-tight sm:text-base text-sm">
          {word}
        </span>
      </span>
    </div>
  );
}
