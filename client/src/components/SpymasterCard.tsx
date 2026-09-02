import type { CardColor } from "@/../shared/src/types/game";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
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
}: SpymasterCardProps) {
  const tileColor = tileBgStyles[color] ?? "bg-(--app-surface)";
  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[5px] border-2 border-[#0a6e9f] ${tileColor} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition duration-200 ease-out ${revealed ? "opacity-90" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      <div className="absolute inset-x-1.25 bottom-1.25 flex min-h-[46%] items-center justify-center rounded-xs border border-black/15 bg-[#fffaf2] p-1 text-center shadow-[0_-2px_4px_rgba(0,0,0,0.15)]">
        <span className="block px-1 text-center wrap-break-word whitespace-normal text-[clamp(0.72rem,2.8vw,1.15rem)] font-black uppercase leading-none tracking-[0.01em] text-[#111820]">
          {word}
        </span>
      </div>
    </div>
  );
}
