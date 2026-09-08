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
      className={`${className} overflow-hidden rounded-2xl border ${active ? "border-[#9af55a]" : "border-white/20"} ${styles.panel} p-2.5 text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-colors duration-200`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
        Operatives
      </div>
      <div className="flex items-end justify-center gap-2">
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
                className="h-9 w-9 rounded-full border-2 border-white/60 object-cover shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
              />
              <span className="mt-1 max-w-16 truncate text-[9px] font-bold leading-none text-white/90">
                {player.displayName}
              </span>
            </button>
          ))}
          {operatives.length === 0 ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
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
