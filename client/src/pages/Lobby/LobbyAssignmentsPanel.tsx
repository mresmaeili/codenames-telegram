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
  canManagePlayers?: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
}

function PlayerList({
  players,
  canManagePlayers,
  onPlayerClick,
}: {
  players: Room["players"];
  canManagePlayers: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="my-3 flex flex-wrap items-center justify-center gap-2">
      {players.map((player) => (
        <button
          key={player.userId}
          type="button"
          onClick={() => onPlayerClick?.(player)}
          disabled={!canManagePlayers}
          className="flex flex-col items-center gap-1 rounded-full bg-white/10 px-2 py-1"
        >
          <img
            src={avatarUrlForPlayer(player)}
            alt={player.displayName}
            title={player.displayName}
            className="h-10 w-10 rounded-full border border-white/30 object-cover"
          />
          <span className="text-xs font-semibold text-white whitespace-nowrap">
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
  pendingAssignment = null,
  canManagePlayers = false,
  onPlayerClick,
}: LobbyAssignmentsPanelProps) {
  const isAssignmentPending = pendingAssignment !== null;

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className="rounded-3xl bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Operatives
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "operative")}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "operative")}
            disabled={isAssignmentPending}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "blue" &&
            pendingAssignment?.role === "operative"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Operatives
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "operative")}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "operative")}
            disabled={isAssignmentPending}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
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
        <section className="rounded-3xl bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Spymasters
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "spymaster")}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "spymaster")}
            disabled={isAssignmentPending}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "blue" &&
            pendingAssignment?.role === "spymaster"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Spymasters
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "spymaster")}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "spymaster")}
            disabled={isAssignmentPending}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
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
