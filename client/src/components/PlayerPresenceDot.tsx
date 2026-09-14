import type { Room } from "@/../shared/src/types/room";

interface PlayerPresenceDotProps {
  player: Room["players"][number];
  className?: string;
}

export function PlayerPresenceDot({
  player,
  className = "",
}: PlayerPresenceDotProps) {
  const presence = player.presence ?? "away";
  const color = presence === "online" ? "bg-[#35c77f]" : "bg-[#7b8587]";
  const label = presence === "online" ? "Online" : "Offline";

  return (
    <span
      aria-label={label}
      title={label}
      className={`absolute -right-0.5 -top-0.5 z-10 h-3 w-3 rounded-full border-2 border-[#e9dfd0] ${color} ${className}`}
    />
  );
}
