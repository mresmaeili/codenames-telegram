import { useEffect, useRef } from "react";
import type { CardColor } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import type { GameTheme } from "@/../shared/src/types/theme";
import { avatarUrlForPlayerInTheme } from "@/lib/avatar";
import { speakRevealedWord } from "@/lib/sound";

interface SpymasterCardProps {
  word: string;
  color: CardColor;
  revealed?: boolean;
  showRevealedWord?: boolean;
  revealAnimationKey?: number;
  revealAnimationDirection?: "open" | "close";
  revealAsset?: string | null;
  theme?: GameTheme;
  selected?: boolean;
  selectedPlayers?: Room["players"];
  ownerIds?: number[];
  onClick?: () => void;
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

export function SpymasterCard({
  word,
  color,
  revealed = false,
  showRevealedWord = false,
  revealAnimationKey = 0,
  revealAnimationDirection,
  revealAsset = null,
  theme,
  selected = false,
  selectedPlayers = [],
  onClick,
}: SpymasterCardProps) {
  const tileStyle = tileStyles[color];
  const stackOverlayAnimation =
    color === "blue"
      ? "animate-stack-card-overlay-blue"
      : color === "red"
        ? "animate-stack-card-overlay-red"
        : "animate-character-reveal";
  const wasRevealedRef = useRef(revealed);
  useEffect(() => {
    if (!wasRevealedRef.current && revealed) {
      speakRevealedWord(word, theme);
    }
    wasRevealedRef.current = revealed;
  }, [revealed, theme, word]);
  const wordLengthClass =
    word.length >= 14
      ? "text-[clamp(0.52rem,1.9vw,0.76rem)]"
      : word.length >= 11
        ? "text-[clamp(0.62rem,2.25vw,0.9rem)]"
        : word.length >= 8
          ? "text-[clamp(0.7rem,2.6vw,1rem)]"
          : "text-[clamp(0.8rem,3vw,1.25rem)]";
  const card = (
    <div
      className={`game-card-surface game-card-theme-${theme ?? "classic"} relative flex aspect-square items-center justify-center rounded-[7px] border ${selected ? "game-card-spymaster-selected border-[#76f21b]" : tileStyle.tile} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_5px_10px_rgba(0,0,0,0.24)] transition duration-200 ease-out ${revealed ? "opacity-90 animate-reveal-card" : ""}`}
      role="img"
      aria-label={`${word} (${color})`}
    >
      {revealed && (color === "blue" || color === "red") ? (
        <div
          className={`game-card-splash game-card-splash-${color}`}
          aria-hidden="true"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              style={
                {
                  "--splash-rotate": `${(index * 37) % 360}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      <div className="game-card-shell">
        {selectedPlayers.length > 0 ? (
          <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-0.5rem)] items-center">
            {selectedPlayers.length === 1 ? (
              <div className="relative flex min-w-0 flex-col items-center text-[0.5rem] font-bold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                <span
                  className={`relative shrink-0 rounded-full ${selectedPlayers[0]?.team === "blue" ? "bg-[#08799f]" : selectedPlayers[0]?.team === "red" ? "bg-[#9f3028]" : "bg-[#5a5a5a]"}`}
                >
                  <img
                    src={avatarUrlForPlayerInTheme(
                      selectedPlayers[0],
                      theme,
                      "operative",
                    )}
                    alt={
                      selectedPlayers[0]?.displayName ?? "Selected by player"
                    }
                    title={selectedPlayers[0]?.displayName}
                    className={`h-6 w-6 rounded-full border object-cover ${selectedPlayers[0]?.team === "blue" ? "border-cyan-300" : selectedPlayers[0]?.team === "red" ? "border-red-300" : "border-white/90"}`}
                  />
                </span>
                <span
                  className={`relative z-10 -mt-2 max-w-14 truncate rounded-sm px-0.5 py-0.5 ${selectedPlayers[0]?.team === "blue" ? "bg-[#08799f]" : selectedPlayers[0]?.team === "red" ? "bg-[#9f3028]" : "bg-[#5a5a5a]"}`}
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
        {(!revealed || showRevealedWord) && (
          <span
            dir="rtl"
            lang="fa"
            className={`game-card-label max-w-full whitespace-nowrap text-center font-persian ${tileStyle.label} ${wordLengthClass} overflow-hidden font-bold uppercase leading-[1.05] tracking-[0.01em]`}
          >
            {word}
          </span>
        )}
      </div>
      {revealed && revealAsset ? (
        <div
          key={revealAnimationKey}
          className={`game-card-character-layer game-card-character-layer-textured ${tileStyle.overlay} ${theme ? `game-card-character-layer-theme-${theme}` : ""} ${theme === "persian" ? "game-card-character-layer-persian" : ""} ${showRevealedWord ? "game-card-character-layer-open animate-character-open" : revealAnimationDirection === "close" ? "animate-character-close" : stackOverlayAnimation}`}
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

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        revealed
          ? `${showRevealedWord ? "Hide" : "Show"} ${word}`
          : `${selected ? "Remove" : "Add"} ${word} to hint count`
      }
      className="spymaster-card-button group block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent)"
    >
      {card}
    </button>
  ) : (
    card
  );
}
