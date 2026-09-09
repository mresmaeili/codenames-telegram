import type { Room } from "@/../shared/src/types/room";

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
  return avatarUrlForEmoji(avatarEmojiForSeed(name || "Player"), name);
}

function avatarUrlForEmoji(emoji: string, seed: string): string {
  const background = avatarBackgroundForSeed(seed || "Player");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${background}"/><circle cx="13" cy="14" r="4" fill="rgba(255,255,255,.55)"/><circle cx="51" cy="48" r="6" fill="rgba(255,255,255,.2)"/><text x="32" y="43" text-anchor="middle" font-size="32" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function avatarUrlForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  if (!player) return avatarUrlForName("Player");
  if (player.avatarId) {
    const selectedAvatar = FUNNY_AVATARS.find(
      (avatar) => avatar.id === player.avatarId,
    );
    if (selectedAvatar)
      return avatarUrlForEmoji(selectedAvatar.emoji, selectedAvatar.id);
  }
  return (
    player.ghibliAvatarUrl ??
    player.photoUrl ??
    avatarUrlForName(player.displayName)
  );
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

export function avatarEmojiForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  const seed = String(
    player?.userId ?? player?.telegramId ?? player?.displayName ?? "",
  );
  return avatarEmojiForSeed(seed);
}
