import type { CardColor } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";
import { PlayerPresenceDot } from "@/components/PlayerPresenceDot";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
  hideWord?: boolean;
  showRevealedWord?: boolean;
  selectedPlayers?: Room["players"];
  ownerIds?: number[];
}

const tileStyles: Record<CardColor, { tile: string; label: string }> = {
  red: { tile: "game-card-tile-red", label: "game-card-label-red" },
  blue: { tile: "game-card-tile-blue", label: "game-card-label-blue" },
  neutral: {
    tile: "game-card-tile-neutral",
    label: "game-card-label-neutral",
  },
  assassin: {
    tile: "game-card-tile-assassin",
    label: "game-card-label-assassin",
  },
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
  ownerIds = [],
}: BoardCardProps) {
  const isFlipped = Boolean(revealedColor);
  const hiddenWord = hideWord || (Boolean(revealedColor) && !showRevealedWord);
  const outerClasses: string[] = [
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)]",
  ];
  if (selectedPlaceholder)
    outerClasses.push(
      "z-10 scale-[1.025] ring-4 ring-(--app-accent) shadow-[0_0_0_4px_rgba(110,229,27,0.3),0_10px_20px_rgba(0,0,0,0.38)]",
    );
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const revealedStyles = revealedColor ? tileStyles[revealedColor] : null;
  const tileColor = revealedStyles?.tile ?? "border-[#e8b98c] bg-[#f8cda8]";
  const labelColor = revealedStyles?.label ?? "";

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[7px] border-2 lg:aspect-[1.55/1] ${selectedPlaceholder ? "border-[#f8e2c8]" : tileColor} ${outerClasses.join(" ")} ${isFlipped ? "animate-flip-card" : ""} transform-gpu transition duration-200 ease-out`}
      data-revealed={revealedColor ? "true" : "false"}
    >
      <div className="game-card-shell">
        {selectedPlayers.length > 0 ? (
          <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center">
            {selectedPlayers.length === 1 ? (
              <div className="relative flex min-w-0 items-center gap-0.5 rounded-full bg-[#4cdf25] pr-1 text-[0.55rem] font-bold leading-none text-[#123d08] shadow-[0_2px_5px_rgba(0,0,0,0.45)]">
                <span className="relative shrink-0">
                  <img
                    src={avatarUrlForPlayer(selectedPlayers[0])}
                    alt={
                      selectedPlayers[0]?.displayName ?? "Selected by player"
                    }
                    title={selectedPlayers[0]?.displayName}
                    className="h-7 w-7 rounded-full border-2 border-white object-cover"
                  />
                  <PlayerPresenceDot
                    player={selectedPlayers[0]}
                    className="border-white"
                  />
                  <PlayerAdminBadge
                    isAdmin={ownerIds.includes(
                      selectedPlayers[0]?.telegramId ?? 0,
                    )}
                  />
                </span>
                <span className="max-w-14 truncate">
                  {selectedPlayers[0]?.displayName ?? "Player"}
                </span>
              </div>
            ) : (
              <span
                className="relative flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#4cdf25] px-1 text-[0.65rem] font-black leading-none text-[#123d08] shadow-[0_2px_5px_rgba(0,0,0,0.45)]"
                aria-label={`${selectedPlayers.length} operatives selected this card`}
              >
                {selectedPlayers.length}
              </span>
            )}
          </div>
        ) : null}
        <span
          dir="rtl"
          lang="fa"
          className={`game-card-label font-persian ${labelColor} text-[clamp(0.72rem,2.8vw,1.08rem)] font-bold uppercase leading-tight tracking-[0.01em] ${hiddenWord ? "opacity-0" : "opacity-100"}`}
        >
          {word}
        </span>
      </div>
    </div>
  );
}
