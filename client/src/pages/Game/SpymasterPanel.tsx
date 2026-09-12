import type { Room, Team } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface SpymasterPanelProps {
  team: Team;
  player?: Room["players"][number];
  ownerIds?: number[];
  active: boolean;
  canManagePlayers: boolean;
  onPlayerClick: (player: Room["players"][number]) => void;
  className?: string;
  compact?: boolean;
}

const panelStyles = {
  blue: {
    panel: "bg-[#168fc5]",
    border: "border-[#23d4ff]",
    avatar: "border-[#9ef3ff]",
    fallback: "🐟",
  },
  red: {
    panel: "bg-[#c94b3b]",
    border: "border-[#f39b84]",
    avatar: "border-[#ffc3be]",
    fallback: "🐙",
  },
} as const;

export function SpymasterPanel({
  team,
  player,
  ownerIds = [],
  active,
  canManagePlayers,
  onPlayerClick,
  className = "",
  compact = false,
}: SpymasterPanelProps) {
  const styles = panelStyles[team];

  return (
    <div
      className={`${className} overflow-hidden rounded-xl border ${active ? "border-[#9af55a]" : "border-white/20"} ${styles.panel} ${compact ? "p-1" : "p-1.5"} text-white shadow-[0_5px_12px_rgba(0,0,0,0.18)] transition-colors duration-200`}
    >
      <div
        className={`${compact ? "text-[7px]" : "text-[8px]"} text-center font-black uppercase tracking-[0.14em] text-white/85`}
      >
        Spymasters
      </div>
      <div
        className={`${compact ? "mt-0" : "mt-1"} flex flex-col items-center justify-center gap-0.5`}
      >
        <button
          type="button"
          onClick={() => player && onPlayerClick(player)}
          disabled={!canManagePlayers || !player}
          className={`flex ${compact ? "h-7 w-7" : "h-9 w-9"} items-center justify-center overflow-hidden rounded-full border ${styles.avatar} bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.25)]`}
          aria-label={
            player ? `Manage ${player.displayName}` : `No ${team} spymaster`
          }
        >
          {player ? (
            <>
              <img
                src={avatarUrlForPlayer(player)}
                alt={player.displayName}
                title={player.displayName}
                className="h-full w-full object-cover"
              />
              {ownerIds.includes(player.telegramId) ? (
                <span
                  aria-label="Room admin"
                  className="absolute -right-1 -top-2 text-[10px] leading-none"
                >
                  👑
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-base">{styles.fallback}</span>
          )}
        </button>
        <div
          className={`${compact ? "text-[7px]" : "text-[8px]"} text-center font-bold text-white/95`}
        >
          {player?.displayName ?? "None"}
        </div>
      </div>
    </div>
  );
}
