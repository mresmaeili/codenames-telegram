import type { CharacterDefinition } from "@/../shared/src/constants/characters";

interface CharacterBadgeProps {
  character: CharacterDefinition | null;
}

export function CharacterBadge({ character }: CharacterBadgeProps) {
  if (!character) return null;

  return (
    <span
      className="max-w-20 truncate rounded-sm bg-black/55 px-1 text-[8px] font-bold text-white/90"
      title={`${character.label} · ${character.asset}`}
      data-character-id={character.id}
      data-character-asset={character.asset}
    >
      {character.label}
    </span>
  );
}
