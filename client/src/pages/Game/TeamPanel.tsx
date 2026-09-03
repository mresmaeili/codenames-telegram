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
      className={`${className} rounded-xl border-2 ${active ? styles.activeBorder : styles.border} ${styles.panel} p-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
        Operatives
      </p>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-end gap-2">
          <div className="text-5xl font-black leading-none">
            {remainingCards}
          </div>
          <div
            className={`mb-0.5 flex h-10 w-7 flex-col justify-end overflow-hidden rounded-sm border-2 border-white/45 ${styles.card} shadow-[0_2px_4px_rgba(0,0,0,0.3)]`}
          >
            <div className={`h-5 ${styles.cardTop}`} />
            <div className={`h-4 ${styles.cardBottom}`} />
          </div>
        </div>
        <div className="flex items-center -space-x-2">
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
                className="h-8 w-8 rounded-full border-2 border-white/60 object-cover"
              />
              <span className="max-w-14 truncate rounded-sm bg-black/65 px-1 text-[8px] font-bold leading-tight text-white">
                {player.displayName}
              </span>
            </button>
          ))}
          {operatives.length === 0 ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xl">
              {styles.fallback}
            </div>
          ) : null}
          {operatives.length > 3 ? (
            <div className="ml-2 rounded-full bg-white/10 px-2 py-1 text-xs">
              +{operatives.length - 3}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
