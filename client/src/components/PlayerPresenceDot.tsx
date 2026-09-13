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
  const color =
    presence === "online"
      ? "bg-[#35c77f]"
      : presence === "offline"
        ? "bg-[#7b8587]"
        : "bg-[#e5a23c]";
  const label =
    presence === "online"
      ? "Online"
      : presence === "offline"
        ? "Offline"
        : "Recently inactive or syncing";

  return (
    <span
      aria-label={label}
      title={label}
      className={`absolute -right-0.5 -top-0.5 z-10 h-3 w-3 rounded-full border-2 border-[#e9dfd0] ${color} ${className}`}
    />
  );
}
