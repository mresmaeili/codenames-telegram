import type { GameTheme } from "@/../shared/src/types/theme";
import persianRedSpymaster from "@/assets/themes/persian/characters/red/spymaster.webp";
import persianBlueSpymaster from "@/assets/themes/persian/characters/blue/spymaster.webp";
import memeRed from "@/assets/themes/meme/red/spymaster.webp";
import memeBlue from "@/assets/themes/meme/blue/spymaster.webp";

export function hintSpeakerAsset(
  theme: GameTheme | undefined,
  team: "red" | "blue",
  _hintKey: string,
): string {
  if (theme === "persian") {
    return team === "red" ? persianRedSpymaster : persianBlueSpymaster;
  }

  return team === "red" ? memeRed : memeBlue;
}
