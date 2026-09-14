import type { Team } from "../types/room.js";
import type { GameTheme } from "../types/theme.js";

export type PersianCharacterId =
  | "warrior"
  | "mounted-warrior"
  | "archer"
  | "spear-warrior"
  | "royal-champion"
  | "young-hero"
  | "veteran-warrior"
  | "legendary-hero"
  | "prince"
  | "strategist"
  | "royal-guard"
  | "court-warrior"
  | "elder-hero"
  | "noble-archer"
  | "wanderer"
  | "explorer"
  | "double-agent";

export type CharacterTeam = Team | "special";

export interface CharacterDefinition {
  id: PersianCharacterId;
  theme: GameTheme;
  team: CharacterTeam;
  name: string;
  label: string;
  asset: string;
}

const asset = (id: PersianCharacterId): string =>
  `/assets/themes/persian/characters/${id}.webp`;

const redCharacters: CharacterDefinition[] = [
  ["warrior", "Warrior"],
  ["mounted-warrior", "Mounted Warrior"],
  ["archer", "Archer"],
  ["spear-warrior", "Spear Warrior"],
  ["royal-champion", "Royal Champion"],
  ["young-hero", "Young Hero"],
  ["veteran-warrior", "Veteran Warrior"],
  ["legendary-hero", "Legendary Hero"],
].map(([id, label]) => ({
  id: id as PersianCharacterId,
  theme: "persian",
  team: "red",
  name: label,
  label,
  asset: asset(id as PersianCharacterId),
}));

const blueCharacters: CharacterDefinition[] = [
  ["prince", "Prince"],
  ["strategist", "Strategist"],
  ["royal-guard", "Royal Guard"],
  ["court-warrior", "Court Warrior"],
  ["elder-hero", "Elder Hero"],
  ["noble-archer", "Noble Archer"],
  ["wanderer", "Wanderer"],
  ["explorer", "Explorer"],
].map(([id, label]) => ({
  id: id as PersianCharacterId,
  theme: "persian",
  team: "blue",
  name: label,
  label,
  asset: asset(id as PersianCharacterId),
}));

export const PERSIAN_CHARACTER_POOL: readonly CharacterDefinition[] = [
  ...redCharacters,
  ...blueCharacters,
  {
    id: "double-agent",
    theme: "persian",
    team: "special",
    name: "Double Agent",
    label: "Double Agent",
    asset: asset("double-agent"),
  },
];

export function characterForTeamSlot(
  theme: GameTheme | undefined,
  team: Team,
  slot: number,
): CharacterDefinition | null {
  if (theme !== "persian") return null;
  const teamCharacters = PERSIAN_CHARACTER_POOL.filter(
    (character) => character.team === team,
  );
  return teamCharacters[slot % teamCharacters.length] ?? null;
}
