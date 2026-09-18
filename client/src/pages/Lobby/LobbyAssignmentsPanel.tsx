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
}: {
  players: Room["players"];
  ownerIds: number[];
  canManagePlayers: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
  theme?: Room["settings"]["theme"];
}) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="my-2 flex min-h-10 flex-wrap items-center justify-center gap-1">
      {players.map((player) => (
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
              className="h-9 w-9 rounded-full border-2 border-white/70 object-cover object-top shadow-[0_2px_5px_rgba(0,0,0,0.25)]"
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

function TeamRoleSection({
  team,
  role,
  players,
  onAssignmentChange,
  pendingAssignment,
  ownerIds,
  canManagePlayers,
  onPlayerClick,
  theme,
  activeTeam,
  activeRole,
}: {
  team: "blue" | "red";
  role: "operative" | "spymaster";
  players: Room["players"];
  onAssignmentChange: (
    nextTeam: "blue" | "red",
    nextRole: "operative" | "spymaster",
  ) => void;
  pendingAssignment?: {
    team: "blue" | "red";
    role: "operative" | "spymaster";
  } | null;
  ownerIds: number[];
  canManagePlayers: boolean;
  onPlayerClick?: (player: Room["players"][number]) => void;
  theme?: Room["settings"]["theme"];
  activeTeam?: "blue" | "red" | null;
  activeRole?: "operative" | "spymaster" | null;
}) {
  const panelClasses = `lobby-team-card ${team === "blue" ? "lobby-team-card-blue" : "lobby-team-card-red"} ${theme === "persian" ? "lobby-team-card-persian" : ""} rounded-xl border-2 p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(0,0,0,0.3)] ${activeTeam === team && activeRole === role ? "border-[#76f21b]" : team === "blue" ? "border-[#75eaff]/70" : "border-[#ffc2aa]/80"}`;

  const label = role === "operative" ? "Operatives" : "Spymasters";
  const isPending =
    pendingAssignment?.team === team && pendingAssignment?.role === role;

  return (
    <section className={panelClasses}>
      <p className="text-center text-lg font-black uppercase tracking-tight">
        {label}
      </p>
      <PlayerList
        players={players}
        ownerIds={ownerIds}
        canManagePlayers={canManagePlayers}
        onPlayerClick={onPlayerClick}
        theme={theme}
      />
      <button
        type="button"
        onClick={() => onAssignmentChange(team, role)}
        disabled={pendingAssignment !== null}
        className="lobby-join-button mt-2 w-full rounded-full border-2 border-[#b9ff79] bg-linear-to-b from-[#63ee21] to-[#22b900] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#168900] active:bg-[#25b900] hover:brightness-105 touch-manipulation select-none disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ WebkitUserSelect: "none" }}
      >
        {isPending ? "Joining..." : "Join team"}
      </button>
    </section>
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
  return (
    <>
      <div className="lobby-assignment-row mt-5 grid grid-cols-2 gap-3">
        {(
          [
            ["blue", "operative"],
            ["red", "operative"],
          ] as const
        ).map(([team, role]) => (
          <TeamRoleSection
            key={`${team}-${role}`}
            team={team}
            role={role}
            players={
              team === "blue"
                ? bluePlayers.filter((p) => p.role === role)
                : redPlayers.filter((p) => p.role === role)
            }
            onAssignmentChange={onAssignmentChange}
            pendingAssignment={pendingAssignment}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
            theme={theme}
            activeTeam={activeTeam}
            activeRole={activeRole}
          />
        ))}
      </div>

      <div className="lobby-assignment-row mt-5 grid grid-cols-2 gap-3">
        {(
          [
            ["blue", "spymaster"],
            ["red", "spymaster"],
          ] as const
        ).map(([team, role]) => (
          <TeamRoleSection
            key={`${team}-${role}`}
            team={team}
            role={role}
            players={
              team === "blue"
                ? bluePlayers.filter((p) => p.role === role)
                : redPlayers.filter((p) => p.role === role)
            }
            onAssignmentChange={onAssignmentChange}
            pendingAssignment={pendingAssignment}
            ownerIds={ownerIds}
            canManagePlayers={canManagePlayers}
            onPlayerClick={onPlayerClick}
            theme={theme}
            activeTeam={activeTeam}
            activeRole={activeRole}
          />
        ))}
      </div>
    </>
  );
}
