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
import assassin from "@/assets/themes/persian/characters/Assassin.webp";
import grey from "@/assets/themes/persian/characters/Grey.webp";

const redAssets = [arash, esfandiar, rostam, rudabeh, tahmineh];
const blueAssets = [fereydun, kaveh, siavash, sohrab, zal];

export function persianRevealAsset(
  theme: "classic" | "persian" | undefined,
  color: "red" | "blue" | "neutral" | "assassin" | null,
  cardIndex: number,
): string | null {
  if (theme !== "persian" || color === null) return null;
  if (color === "neutral") return grey;
  if (color === "assassin") return assassin;
  const assets = color === "red" ? redAssets : blueAssets;
  return assets[Math.abs(cardIndex * 17 + 3) % assets.length] ?? null;
}
