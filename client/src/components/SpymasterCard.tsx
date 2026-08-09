import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
}

const colorStyles: Record<CardColor, string> = {
  red: "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  neutral:
    "border-[color:var(--app-border)] bg-[color:var(--app-background)] text-[color:var(--app-text)]",
  assassin: "border-black bg-black/80 text-white",
};

export function SpymasterCard({
  word,
  color,
  revealed = false,
}: SpymasterCardProps) {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-3xl border px-3 py-4 text-center text-sm font-semibold shadow-sm transition duration-200 ease-out ${colorStyles[color]} ${revealed ? "opacity-80 scale-105" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <span className="px-2 text-center wrap-break-word whitespace-normal leading-tight sm:text-base text-sm">
        {word}
      </span>
    </div>
  );
}
