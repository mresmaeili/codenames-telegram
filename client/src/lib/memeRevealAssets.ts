import assassin from "@/assets/themes/meme/Assassin.webp";
import grey from "@/assets/themes/meme/Grey.webp";
import blueCharacter from "@/assets/themes/meme/blue/operative-1.webp";
import redCharacter from "@/assets/themes/meme/red/operative-1.webp";

export function memeRevealAsset(
  color: "red" | "blue" | "neutral" | "assassin" | null,
): string | null {
  if (color === null) return null;
  if (color === "red") return redCharacter;
  if (color === "blue") return blueCharacter;
  if (color === "neutral") return grey;
  return assassin;
}
