import type { GameTheme } from "@/../shared/src/types/theme";
import arash from "@/assets/themes/persian/characters/red/Arash.webp";
import esfandiar from "@/assets/themes/persian/characters/red/Esfandiar.webp";
import rostam from "@/assets/themes/persian/characters/red/Rostam.webp";
import rudabeh from "@/assets/themes/persian/characters/red/Rudabeh.webp";
import tahmineh from "@/assets/themes/persian/characters/red/Tahmineh.webp";
import fereydun from "@/assets/themes/persian/characters/blue/Fereydun.webp";
import kaveh from "@/assets/themes/persian/characters/blue/Kaveh.webp";
import siavash from "@/assets/themes/persian/characters/blue/Siavash.webp";
import sohrab from "@/assets/themes/persian/characters/blue/Sohrab.webp";
import zal from "@/assets/themes/persian/characters/blue/Zal.webp";
import memeRed from "@/assets/themes/meme/red/yuze-yaldar.webp";
import memeBlue from "@/assets/themes/meme/blue/ostad-bagheri.webp";

const persianRed = [arash, esfandiar, rostam, rudabeh, tahmineh];
const persianBlue = [fereydun, kaveh, siavash, sohrab, zal];

function stableIndex(seed: string, length: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % length;
}

export function hintSpeakerAsset(
  theme: GameTheme | undefined,
  team: "red" | "blue",
  hintKey: string,
): string {
  if (theme === "persian") {
    const assets = team === "red" ? persianRed : persianBlue;
    return assets[stableIndex(hintKey, assets.length)] ?? assets[0];
  }

  return team === "red" ? memeRed : memeBlue;
}
