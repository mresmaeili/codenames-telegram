import type { CardColor } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
  hideWord?: boolean;
  showRevealedWord?: boolean;
  selectedPlayers?: Room["players"];
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
  showRevealedWord = false,
  selectedPlayers = [],
}: BoardCardProps) {
  const isFlipped = selectedPlaceholder || Boolean(revealedColor);
  const hiddenWord = hideWord || (Boolean(revealedColor) && !showRevealedWord);
  const outerClasses: string[] = [
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
  ];
  if (selectedPlaceholder) outerClasses.push("ring-2 ring-(--app-accent)");
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const tileColor = revealedColor
    ? tileBgStyles[revealedColor]
    : selectedPlaceholder
      ? "bg-[#987653]"
      : "bg-[#f5cda9]";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[5px] border-2 ${selectedPlaceholder ? "border-[#f8e2c8]" : "border-[#0a6e9f]"} ${tileColor} ${outerClasses.join(" ")} ${isFlipped ? "animate-flip-card" : ""} transform-gpu transition duration-200 ease-out`}
      data-revealed={revealedColor ? "true" : "false"}
    >
      <div
        className={`absolute flex items-center justify-center rounded-xs border p-1 text-center ${selectedPlaceholder ? "inset-1.25 border-[#6e4d32] bg-[#fffaf2] shadow-[inset_0_0_0_3px_rgba(255,241,220,0.18)]" : revealedColor ? "inset-x-1.25 bottom-1.25 min-h-[46%] border-black/15 bg-[#fffaf2] shadow-[0_-2px_4px_rgba(0,0,0,0.15)]" : "inset-1.25 border-black/15 bg-[#fffaf2]"}`}
      >
        {selectedPlayers.length > 0 ? (
          <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center">
            {selectedPlayers.length === 1 ? (
              <div className="flex min-w-0 items-center gap-0.5 rounded-full bg-black/65 pr-1 text-[0.55rem] font-bold leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
                <img
                  src={avatarUrlForPlayer(selectedPlayers[0])}
                  alt={selectedPlayers[0]?.displayName ?? "Selected by player"}
                  title={selectedPlayers[0]?.displayName}
                  className="h-6 w-6 shrink-0 rounded-full border-2 border-white object-cover"
                />
                <span className="max-w-14 truncate">
                  {selectedPlayers[0]?.displayName ?? "Player"}
                </span>
              </div>
            ) : (
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-black/75 px-1 text-[0.65rem] font-black leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
                aria-label={`${selectedPlayers.length} operatives selected this card`}
              >
                {selectedPlayers.length}
              </span>
            )}
          </div>
        ) : null}
        <span
          className={`absolute bottom-1 block w-full font-black uppercase tracking-[0.01em] text-[clamp(0.64rem,2.5vw,1rem)] leading-none text-[#111820] ${hiddenWord ? "opacity-0" : "opacity-100"}`}
        >
          {word}
        </span>
      </div>
    </div>
  );
}
