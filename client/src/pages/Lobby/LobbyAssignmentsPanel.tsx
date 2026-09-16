import { avatarUrlForPlayerInTheme } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";
import { PlayerPresenceDot } from "@/components/PlayerPresenceDot";
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
  theme?: Room["settings"]["theme"];
  activeTeam?: "blue" | "red" | null;
  activeRole?: "operative" | "spymaster" | null;
}

function PlayerList({
  players,
  ownerIds,
  canManagePlayers,
  onPlayerClick,
  theme,
  team,
}: {
  players: Room["players"];
  ownerIds: number[];
  canManagePlayers: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
  theme?: Room["settings"]["theme"];
  team: "blue" | "red";
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="my-2 flex min-h-10 flex-wrap items-center justify-center gap-1">
      {players.map((player, index) => (
        <button
          key={player.userId}
          type="button"
          onClick={() => onPlayerClick?.(player)}
          disabled={!canManagePlayers}
          className="flex min-h-0 flex-col items-center gap-0.5 rounded-full px-1 py-0.5"
        >
          <span className="relative">
            <img
              src={avatarUrlForPlayerInTheme(
                player,
                theme,
                player.role ?? "operative",
              )}
              alt={player.displayName}
              title={player.displayName}
              className="h-9 w-9 rounded-full border-2 border-white/70 object-cover shadow-[0_2px_5px_rgba(0,0,0,0.25)]"
            />
            <PlayerPresenceDot player={player} className="border-white" />
            <PlayerAdminBadge isAdmin={ownerIds.includes(player.telegramId)} />
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
  theme,
}: LobbyAssignmentsPanelProps) {
  const isAssignmentPending = pendingAssignment !== null;
  const panelClasses = (
    team: "blue" | "red",
    role: "operative" | "spymaster",
  ) =>
    `lobby-team-card ${team === "blue" ? "lobby-team-card-blue" : "lobby-team-card-red"} ${theme === "persian" ? "lobby-team-card-persian" : ""} rounded-xl border-2 p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(0,0,0,0.3)] ${activeTeam === team && activeRole === role ? "border-[#76f21b]" : team === "blue" ? "border-[#75eaff]/70" : "border-[#ffc2aa]/80"}`;

  return (
    <>
      <div className="lobby-assignment-row mt-5 grid grid-cols-2 gap-3">
        <section className={panelClasses("blue", "operative")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Operatives
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "operative")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
            theme={theme}
            team="blue"
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "operative")}
            disabled={isAssignmentPending}
            className="lobby-join-button mt-2 w-full rounded-full border-2 border-[#b9ff79] bg-gradient-to-b from-[#63ee21] to-[#22b900] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#168900] active:bg-[#25b900] hover:brightness-105 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
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
            theme={theme}
            team="red"
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "operative")}
            disabled={isAssignmentPending}
            className="lobby-join-button mt-2 w-full rounded-full border-2 border-[#b9ff79] bg-gradient-to-b from-[#63ee21] to-[#22b900] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#168900] active:bg-[#25b900] hover:brightness-105 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ WebkitUserSelect: "none" }}
          >
            {pendingAssignment?.team === "red" &&
            pendingAssignment?.role === "operative"
              ? "Joining..."
              : "Join team"}
          </button>
        </section>
      </div>

      <div className="lobby-assignment-row mt-5 grid grid-cols-2 gap-3">
        <section className={panelClasses("blue", "spymaster")}>
          <p className="text-center text-lg font-black uppercase tracking-tight">
            Spymasters
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "spymaster")}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
            theme={theme}
            team="blue"
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "spymaster")}
            disabled={isAssignmentPending}
            className="lobby-join-button mt-2 w-full rounded-full border-2 border-[#b9ff79] bg-gradient-to-b from-[#63ee21] to-[#22b900] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#168900] active:bg-[#25b900] hover:brightness-105 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
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
            theme={theme}
            team="red"
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "spymaster")}
            disabled={isAssignmentPending}
            className="lobby-join-button mt-2 w-full rounded-full border-2 border-[#b9ff79] bg-gradient-to-b from-[#63ee21] to-[#22b900] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#168900] active:bg-[#25b900] hover:brightness-105 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
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
