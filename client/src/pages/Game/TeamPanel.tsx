import type { Room, Team } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";

interface TeamPanelProps {
  team: Team;
  remainingCards: number;
  operatives: Room["players"];
  ownerIds?: number[];
  active: boolean;
  canManagePlayers: boolean;
  onPlayerClick: (player: Room["players"][number]) => void;
  className?: string;
  compact?: boolean;
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
    panel: "bg-[#d66055]",
    border: "border-[#efaa9d]",
    activeBorder: "border-[#76f21b]",
    card: "bg-[#b4514a]",
    cardTop: "bg-[#d66055]",
    cardBottom: "bg-[#f0d8cf]",
    fallback: "🐙",
  },
} as const;

export function TeamPanel({
  team,
  remainingCards,
  operatives,
  ownerIds = [],
  active,
  canManagePlayers,
  onPlayerClick,
  className = "",
  compact = false,
}: TeamPanelProps) {
  const styles = teamStyles[team];

  return (
    <div
      className={`${className} overflow-hidden rounded-xl border ${active ? "border-[#9af55a]" : "border-white/20"} ${styles.panel} ${compact ? "p-1" : "p-1.5"} text-white shadow-[0_5px_12px_rgba(0,0,0,0.18)] transition-colors duration-200`}
    >
      <div
        className={`${compact ? "mb-0 text-[7px]" : "mb-1 text-[8px]"} text-center font-black uppercase tracking-[0.14em] text-white/85`}
      >
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
              <span className="relative">
                <img
                  src={avatarUrlForPlayer(player)}
                  alt={player.displayName}
                  title={player.displayName}
                  className={`${compact ? "h-6 w-6" : "h-7 w-7"} rounded-full border border-white/60 object-cover shadow-[0_3px_7px_rgba(0,0,0,0.25)]`}
                />
                <PlayerAdminBadge
                  isAdmin={ownerIds.includes(player.telegramId)}
                />
              </span>
              <span
                className={`${compact ? "text-[7px]" : "text-[8px]"} mt-0.5 max-w-14 truncate font-bold leading-none text-white/90`}
              >
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
