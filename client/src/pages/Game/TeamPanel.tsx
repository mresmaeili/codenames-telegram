import type { Room, Team } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface TeamPanelProps {
  team: Team;
  remainingCards: number;
  operatives: Room["players"];
  active: boolean;
  canManagePlayers: boolean;
  onPlayerClick: (player: Room["players"][number]) => void;
  className?: string;
}

const teamStyles = {
  blue: {
    panel: "bg-[#159dce]",
    border: "border-[#23d4ff]/70",
    activeBorder: "border-[#76f21b]",
    card: "bg-[#116a91]",
    cardTop: "bg-[#0b77a7]",
    cardBottom: "bg-[#dbe8e8]",
    fallback: "🐟",
  },
  red: {
    panel: "bg-[#c94b3b]",
    border: "border-[#e88963]",
    activeBorder: "border-[#76f21b]",
    card: "bg-[#a23d38]",
    cardTop: "bg-[#d84c3e]",
    cardBottom: "bg-[#f1d4c4]",
    fallback: "🐙",
  },
} as const;

export function TeamPanel({
  team,
  remainingCards,
  operatives,
  active,
  canManagePlayers,
  onPlayerClick,
  className = "",
}: TeamPanelProps) {
  const styles = teamStyles[team];

  return (
    <div
      className={`${className} overflow-hidden rounded-xl border ${active ? "border-[#9af55a]" : "border-white/20"} ${styles.panel} p-1.5 text-white shadow-[0_5px_12px_rgba(0,0,0,0.18)] transition-colors duration-200`}
    >
      <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.14em] text-white/85">
        Operatives
      </div>
      <div className="flex items-end justify-center gap-1">
        <div className="flex items-end justify-center -space-x-2">
          {operatives.slice(0, 3).map((player) => (
            <button
              key={player.userId}
              type="button"
              onClick={() => onPlayerClick(player)}
              disabled={!canManagePlayers}
              className="flex flex-col items-center rounded-full disabled:cursor-default"
              aria-label={`Manage ${player.displayName}`}
            >
              <img
                src={avatarUrlForPlayer(player)}
                alt={player.displayName}
                title={player.displayName}
                className="h-7 w-7 rounded-full border border-white/60 object-cover shadow-[0_3px_7px_rgba(0,0,0,0.25)]"
              />
              <span className="mt-0.5 max-w-14 truncate text-[8px] font-bold leading-none text-white/90">
                {player.displayName}
              </span>
            </button>
          ))}
          {operatives.length === 0 ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-base shadow-[0_3px_7px_rgba(0,0,0,0.25)]">
              {styles.fallback}
            </div>
          ) : null}
          {operatives.length > 3 ? (
            <div className="ml-2 rounded-full bg-black/20 px-2 py-1 text-[9px] font-bold">
              +{operatives.length - 3}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
