import type { Room } from "@/../shared/src/types/room";

export function avatarUrlForName(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=ffffff&color=000000&size=64`;
}

export function avatarUrlForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  if (!player) return avatarUrlForName("Player");
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

export function avatarEmojiForPlayer(
  player: Room["players"][number] | null | undefined,
): string {
  const seed = String(
    player?.userId ?? player?.telegramId ?? player?.displayName ?? "",
  );
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return EMOJIS[sum % EMOJIS.length];
}
