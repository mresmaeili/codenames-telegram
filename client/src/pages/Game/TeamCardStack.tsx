import type { GameTheme } from "@/../shared/src/types/theme";
import { memeRevealAsset } from "@/lib/memeRevealAssets";
import { persianRevealAsset } from "@/lib/persianRevealAssets";

interface TeamCardStackProps {
  team: "blue" | "red";
  remainingCards: number;
  theme?: GameTheme;
  compact?: boolean;
}

function stackCharacterAsset(
  theme: GameTheme | undefined,
  team: "blue" | "red",
): string | null {
  if (theme === "meme") return memeRevealAsset(team);
  return persianRevealAsset(theme, team, team === "blue" ? 1 : 2);
}

export function TeamCardStack({
  team,
  remainingCards,
  theme,
  compact = false,
}: TeamCardStackProps) {
  const asset = stackCharacterAsset(theme, team);
  const teamLabel = team === "blue" ? "Blue" : "Red";

  return (
    <div
      className={`game-card-stack game-card-stack-${team} ${compact ? "game-card-stack-compact" : ""}`}
      data-team={team}
      aria-label={`${teamLabel} card stack, ${remainingCards} cards remaining`}
    >
      <span className="game-card-stack-layer game-card-stack-layer-back" />
      <span className="game-card-stack-layer game-card-stack-layer-middle" />
      <span className="game-card-stack-top">
        {asset ? (
          <img src={asset} alt="" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{team === "blue" ? "🐟" : "🐙"}</span>
        )}
      </span>
    </div>
  );
}
