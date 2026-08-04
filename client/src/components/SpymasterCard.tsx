import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
}

const colorStyles: Record<CardColor, string> = {
  red: "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  neutral: "border-(--app-border) bg-(--app-background) text-(--app-text)",
  assassin: "border-black bg-black/80 text-white",
};

export function SpymasterCard({
  word,
  color,
  revealed = false,
}: SpymasterCardProps) {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-medium shadow-sm ${colorStyles[color]} ${revealed ? "opacity-70" : ""}`}
    >
      {word}
    </div>
  );
}
