import type { CardColor } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import type { GameTheme } from "@/../shared/src/types/theme";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface BoardCardProps {
  word: string;
  disabled?: boolean;
  revealPlaceholder?: boolean;
  selectedPlaceholder?: boolean;
  revealedColor?: CardColor | null;
  hideWord?: boolean;
  showRevealedWord?: boolean;
  revealAnimationKey?: number;
  revealAnimationDirection?: "open" | "close";
  theme?: GameTheme;
  selectedPlayers?: Room["players"];
  revealAsset?: string | null;
}

const tileStyles: Record<
  CardColor,
  { tile: string; label: string; overlay: string }
> = {
  red: {
    tile: "game-card-tile-red",
    label: "game-card-label-red",
    overlay: "game-card-overlay-red",
  },
  blue: {
    tile: "game-card-tile-blue",
    label: "game-card-label-blue",
    overlay: "game-card-overlay-blue",
  },
  neutral: {
    tile: "game-card-tile-neutral",
    label: "game-card-label-neutral",
    overlay: "game-card-overlay-neutral",
  },
  assassin: {
    tile: "game-card-tile-assassin",
    label: "game-card-label-assassin",
    overlay: "game-card-overlay-assassin",
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
  revealAnimationKey = 0,
  revealAnimationDirection,
  theme,
  selectedPlayers = [],
  revealAsset = null,
}: BoardCardProps) {
  const isFlipped = Boolean(revealedColor);
  const hiddenWord =
    (hideWord && !showRevealedWord) ||
    (Boolean(revealedColor) && !showRevealedWord);
  const outerClasses: string[] = [
    "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)]",
  ];
  if (disabled) outerClasses.push("opacity-60 pointer-events-none");

  const revealedStyles = revealedColor ? tileStyles[revealedColor] : null;
  const tileColor = revealedStyles?.tile ?? "border-[#e8b98c] bg-[#f8cda8]";
  const labelColor = revealedStyles?.label ?? "";
  const overlayColor = revealedStyles?.overlay ?? "";
  const wordLengthClass =
    word.length >= 14
      ? "text-[clamp(0.48rem,1.8vw,0.72rem)]"
      : word.length >= 11
        ? "text-[clamp(0.58rem,2.2vw,0.86rem)]"
        : word.length >= 8
          ? "text-[clamp(0.65rem,2.5vw,0.96rem)]"
          : "text-[clamp(0.72rem,2.8vw,1.08rem)]";

  return (
    <div
      className={`game-card-surface game-card-theme-${theme ?? "classic"} relative flex aspect-square items-center justify-center rounded-[7px] border ${tileColor} ${outerClasses.join(" ")} ${isFlipped ? "animate-flip-card" : ""} transform-gpu transition duration-200 ease-out`}
      data-revealed={revealedColor ? "true" : "false"}
    >
      <div className="game-card-shell">
        {selectedPlayers.length > 0 ? (
          <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center">
            {selectedPlayers.length === 1 ? (
              <div className="relative flex min-w-0 flex-col items-center text-[0.5rem] font-bold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                <span
                  className={`relative shrink-0 rounded-full ${selectedPlayers[0]?.team === "blue" ? "bg-[#08799f]" : selectedPlayers[0]?.team === "red" ? "bg-[#9f3028]" : "bg-[#5a5a5a]"}`}
                >
                  <img
                    src={avatarUrlForPlayer(selectedPlayers[0])}
                    alt={
                      selectedPlayers[0]?.displayName ?? "Selected by player"
                    }
                    title={selectedPlayers[0]?.displayName}
                    className={`h-6 w-6 rounded-full border object-cover ${selectedPlayers[0]?.team === "blue" ? "border-cyan-300" : selectedPlayers[0]?.team === "red" ? "border-red-300" : "border-white/90"}`}
                  />
                </span>
                <span
                  className={`relative z-10 -mt-2 max-w-14 truncate rounded-sm px-0.5 py-0.5 text-[0.5rem] ${selectedPlayers[0]?.team === "blue" ? "bg-[#08799f]" : selectedPlayers[0]?.team === "red" ? "bg-[#9f3028]" : "bg-[#5a5a5a]"}`}
                >
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
          className={`game-card-label max-w-full whitespace-nowrap text-center font-persian ${labelColor} ${wordLengthClass} overflow-hidden font-bold uppercase leading-[1.05] tracking-[0.01em] ${hiddenWord ? "opacity-0" : "opacity-100"}`}
        >
          {word}
        </span>
      </div>
      {revealAsset ? (
        <div
          key={revealAnimationKey}
          className={`game-card-character-layer game-card-character-layer-textured ${overlayColor} ${theme ? `game-card-character-layer-theme-${theme}` : ""} ${theme === "persian" ? "game-card-character-layer-persian" : ""} ${showRevealedWord ? "game-card-character-layer-open animate-character-open" : revealAnimationDirection === "close" ? "animate-character-close" : "animate-character-reveal"}`}
          aria-hidden="true"
        >
          <img
            src={revealAsset}
            alt=""
            className="h-full w-full object-contain object-bottom"
          />
        </div>
      ) : null}
    </div>
  );
}
