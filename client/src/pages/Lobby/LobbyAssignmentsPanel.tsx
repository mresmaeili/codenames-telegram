import { avatarUrlForPlayer } from "@/lib/avatar";
import type { Room } from "../../../../shared/src/types/room";

interface LobbyAssignmentsPanelProps {
  bluePlayers: Room["players"];
  redPlayers: Room["players"];
  onAssignmentChange: (
    nextTeam: "blue" | "red",
    nextRole: "operative" | "spymaster",
  ) => void;
  pendingAssignment?: {
    team: "blue" | "red";
    role: "operative" | "spymaster";
  } | null;
  ownerIds?: number[];
  canManagePlayers?: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
  activeTeam?: "blue" | "red" | null;
  activeRole?: "operative" | "spymaster" | null;
}

function PlayerList({
  players,
  ownerIds,
  canManagePlayers,
  onPlayerClick,
}: {
  players: Room["players"];
  ownerIds: number[];
  canManagePlayers: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="my-3 flex min-h-14 flex-wrap items-center justify-center gap-2">
      {players.map((player) => (
        <button
          key={player.userId}
          type="button"
          onClick={() => onPlayerClick?.(player)}
          disabled={!canManagePlayers}
          className="flex flex-col items-center gap-1 rounded-full px-1 py-1"
        >
          <span className="relative">
            <img
              src={avatarUrlForPlayer(player)}
              alt={player.displayName}
              title={player.displayName}
              className="h-11 w-11 rounded-full border-2 border-white/70 object-cover shadow-[0_2px_5px_rgba(0,0,0,0.25)]"
            />
            {ownerIds.includes(player.telegramId) ? (
              <span
                aria-label="Room admin"
                className="absolute -right-1 -top-2 text-sm leading-none"
              >
                👑
              </span>
            ) : null}
          </span>
          <span className="max-w-18 truncate rounded-sm bg-black/65 px-1.5 text-[10px] font-bold text-white whitespace-nowrap">
            {player.displayName}
          </span>
        </button>
      ))}
    </div>
  );
}

export function LobbyAssignmentsPanel({
  bluePlayers,
  redPlayers,
  onAssignmentChange,
  ownerIds = [],
  pendingAssignment = null,
  canManagePlayers = false,
  onPlayerClick,
  activeTeam = null,
  activeRole = null,
}: LobbyAssignmentsPanelProps) {
  const isAssignmentPending = pendingAssignment !== null;
  const panelClasses = (
    team: "blue" | "red",
    role: "operative" | "spymaster",
  ) =>
    `rounded-xl border-2 p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(0,0,0,0.2)] ${
      team === "blue" ? "bg-[#159dce]" : "bg-[#ef5b5b]"
    } ${activeTeam === team && activeRole === role ? "border-[#76f21b]" : team === "blue" ? "border-[#75eaff]/70" : "border-[#ffc2aa]/80"}`;

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className={panelClasses("blue", "operative")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Operatives
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "operative")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "operative")}
            disabled={isAssignmentPending}
            className="mt-2 w-full rounded-full border-2 border-white/80 bg-white/10 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white active:bg-white/25 hover:bg-white/15 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "blue" &&
            pendingAssignment?.role === "operative"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>

        <section className={panelClasses("red", "operative")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Operatives
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "operative")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "operative")}
            disabled={isAssignmentPending}
            className="mt-2 w-full rounded-full border-2 border-white/80 bg-white/10 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white active:bg-white/25 hover:bg-white/15 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "red" &&
            pendingAssignment?.role === "operative"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className={panelClasses("blue", "spymaster")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Spymasters
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "spymaster")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "spymaster")}
            disabled={isAssignmentPending}
            className="mt-2 w-full rounded-full border-2 border-white/80 bg-white/10 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white active:bg-white/25 hover:bg-white/15 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "blue" &&
            pendingAssignment?.role === "spymaster"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>

        <section className={panelClasses("red", "spymaster")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Spymasters
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "spymaster")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "spymaster")}
            disabled={isAssignmentPending}
            className="mt-2 w-full rounded-full border-2 border-white/80 bg-white/10 px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white active:bg-white/25 hover:bg-white/15 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "red" &&
            pendingAssignment?.role === "spymaster"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>
      </div>
    </>
  );
}
