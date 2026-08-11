import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
}

const tileBgStyles: Record<CardColor, string> = {
  red: "bg-red-500/95",
  blue: "bg-blue-500/95",
  neutral: "bg-(--app-surface)/95",
  assassin: "bg-black/95",
};

export function SpymasterCard({
  word,
  color,
  revealed = false,
}: SpymasterCardProps) {
  const tileColor = tileBgStyles[color] ?? "bg-(--app-surface)";
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl ${tileColor} shadow-md transition duration-200 ease-out ${revealed ? "opacity-90 scale-105" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <div className="absolute inset-3 rounded-lg bg-white/95 flex items-center justify-center px-3 py-2">
        <span className="px-2 text-center wrap-break-word whitespace-normal leading-tight sm:text-base text-sm font-extrabold text-(--app-text)">
          {word}
        </span>
      </div>
    </div>
  );
}
