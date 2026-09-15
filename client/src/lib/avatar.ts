import type { Room } from "@/../shared/src/types/room";
import arashPortrait from "@/assets/themes/persian/characters/red/Arash.webp";
import esfandiarPortrait from "@/assets/themes/persian/characters/red/Esfandiar.webp";
import rostamPortrait from "@/assets/themes/persian/characters/red/Rostam.webp";
import rudabehPortrait from "@/assets/themes/persian/characters/red/Rudabeh.webp";
import tahminehPortrait from "@/assets/themes/persian/characters/red/Tahmineh.webp";
import fereydunPortrait from "@/assets/themes/persian/characters/blue/Fereydun.webp";
import kavehPortrait from "@/assets/themes/persian/characters/blue/Kaveh.webp";
import siavashPortrait from "@/assets/themes/persian/characters/blue/Siavash.webp";
import sohrabPortrait from "@/assets/themes/persian/characters/blue/Sohrab.webp";
import zalPortrait from "@/assets/themes/persian/characters/blue/Zal.webp";

export const FUNNY_AVATARS = [
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "frog", emoji: "🐸", label: "Frog" },
  { id: "octopus", emoji: "🐙", label: "Octopus" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
  { id: "dinosaur", emoji: "🦖", label: "Dinosaur" },
  { id: "bee", emoji: "🐝", label: "Bee" },
] as const;

export function avatarUrlForName(name: string): string {
  return avatarPortraitForSeed(name || "Player");
}

export function avatarUrlForProfile(profile: {
  displayName: string;
  avatarId?: string | null;
  photoUrl?: string | null;
  ghibliAvatarUrl?: string | null;
  team?: "red" | "blue" | null;
}): string {
  if (profile.avatarId) {
    const selectedAvatar = FUNNY_AVATARS.find(
      (avatar) => avatar.id === profile.avatarId,
    );
    if (selectedAvatar) {
      return avatarUrlForEmoji(selectedAvatar.emoji, selectedAvatar.id);
    }
  }

  return (
    profile.ghibliAvatarUrl ??
    profile.photoUrl ??
    avatarPortraitForSeed(profile.displayName, profile.team)
  );
}

function avatarUrlForEmoji(emoji: string, seed: string): string {
  const safeSeed = seed || "Player";
  const background = avatarBackgroundForSeed(safeSeed);
  const secondary = avatarSecondaryBackgroundForSeed(safeSeed);
  const patternId = `avatar-pattern-${avatarSeed(safeSeed)}`;
  const gradientId = `avatar-gradient-${avatarSeed(`${safeSeed}:gradient`)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${secondary}"/></linearGradient><pattern id="${patternId}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0h12M0 6h12" stroke="rgba(255,255,255,.14)" stroke-width="2"/></pattern></defs><circle cx="32" cy="32" r="31" fill="#101923"/><circle cx="32" cy="32" r="28.5" fill="url(#${gradientId})"/><circle cx="32" cy="32" r="28.5" fill="url(#${patternId})"/><path d="M10 24c5-11 15-17 27-17 8 0 15 2 20 7" fill="none" stroke="rgba(255,255,255,.55)" stroke-linecap="round" stroke-width="2"/><circle cx="51" cy="48" r="6" fill="rgba(255,255,255,.14)"/><text x="32" y="43" text-anchor="middle" font-size="30" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PORTRAIT_ASSETS = [
  arashPortrait,
  esfandiarPortrait,
  rostamPortrait,
  rudabehPortrait,
  tahminehPortrait,
  fereydunPortrait,
  kavehPortrait,
  siavashPortrait,
  sohrabPortrait,
  zalPortrait,
];

const RED_PORTRAIT_ASSETS = [
  arashPortrait,
  esfandiarPortrait,
  rostamPortrait,
  rudabehPortrait,
  tahminehPortrait,
];

const BLUE_PORTRAIT_ASSETS = [
  fereydunPortrait,
  kavehPortrait,
  siavashPortrait,
  sohrabPortrait,
  zalPortrait,
];

function avatarPortraitForSeed(
  seed: string,
  team?: "red" | "blue" | null,
): string {
  const portraits =
    team === "red"
      ? RED_PORTRAIT_ASSETS
      : team === "blue"
        ? BLUE_PORTRAIT_ASSETS
        : PORTRAIT_ASSETS;
  return (
    portraits[avatarSeed(`${seed}:portrait`) % portraits.length] ?? portraits[0]
  );
}

export function avatarUrlForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  if (!player) return avatarUrlForName("Player");
  return avatarUrlForProfile({ ...player, team: player.team });
}

const EMOJIS = [
  "🐶",
  "🐱",
  "🦊",
  "🐵",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐙",
  "🦄",
  "🐝",
  "🐞",
  "🐢",
  "🐬",
  "🦋",
  "🦖",
  "🦝",
];

const AVATAR_BACKGROUNDS = [
  "#f4513f",
  "#159dce",
  "#7c5cff",
  "#e49b32",
  "#27a66f",
  "#d45a9f",
];

function avatarSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function avatarEmojiForSeed(seed: string): string {
  return EMOJIS[avatarSeed(seed) % EMOJIS.length];
}

function avatarBackgroundForSeed(seed: string): string {
  return AVATAR_BACKGROUNDS[
    avatarSeed(`${seed}:color`) % AVATAR_BACKGROUNDS.length
  ];
}

function avatarSecondaryBackgroundForSeed(seed: string): string {
  return AVATAR_BACKGROUNDS[
    avatarSeed(`${seed}:secondary`) % AVATAR_BACKGROUNDS.length
  ];
}

export function avatarEmojiForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  const seed = String(
    player?.userId ?? player?.telegramId ?? player?.displayName ?? "",
  );
  return avatarEmojiForSeed(seed);
}
