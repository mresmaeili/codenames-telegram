import type { Room, Team } from "@/../shared/src/types/room";
import { avatarUrlForPlayer } from "@/lib/avatar";

interface SpymasterPanelProps {
  team: Team;
  player?: Room["players"][number];
  active: boolean;
  canManagePlayers: boolean;
  onPlayerClick: (player: Room["players"][number]) => void;
  className?: string;
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
  active,
  canManagePlayers,
  onPlayerClick,
  className = "",
}: SpymasterPanelProps) {
  const styles = panelStyles[team];

  return (
    <div
      className={`${className} rounded-xl border-2 ${active ? "border-[#76f21b]" : styles.border} ${styles.panel} p-1.5 text-white`}
    >
      <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
        Spymasters
      </div>
      <div className="relative mt-3 flex items-center justify-center">
        <button
          type="button"
          onClick={() => player && onPlayerClick(player)}
          disabled={!canManagePlayers || !player}
          className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-4 ${styles.avatar} bg-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.25)]`}
          aria-label={
            player ? `Manage ${player.displayName}` : `No ${team} spymaster`
          }
        >
          {player ? (
            <img
              src={avatarUrlForPlayer(player)}
              alt={player.displayName}
              title={player.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl">{styles.fallback}</span>
          )}
        </button>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs text-white shadow-md">
          {player?.displayName ?? "None"}
        </div>
      </div>
    </div>
  );
}
