import { avatarUrlForPlayer } from "@/lib/avatar";
import type { Room } from "../../../../shared/src/types/room";

interface LobbyAssignmentsPanelProps {
  bluePlayers: Room["players"];
  redPlayers: Room["players"];
  onAssignmentChange: (
    nextTeam: "blue" | "red",
    nextRole: "operative" | "spymaster",
  ) => void;
}

function PlayerList({ players }: { players: Room["players"] }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-3 pointer-events-none">
      {players.slice(0, 4).map((player) => (
        <div key={player.userId} className="flex flex-col items-center">
          <img
            src={avatarUrlForPlayer(player)}
            alt={player.displayName}
            title={player.displayName}
            className="h-9 w-9 rounded-full border border-white/20 object-cover pointer-events-none"
          />
        </div>
      ))}
    </div>
  );
}

export function LobbyAssignmentsPanel({
  bluePlayers,
  redPlayers,
  onAssignmentChange,
}: LobbyAssignmentsPanelProps) {
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className="rounded-3xl bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Operatives
          </p>
          <PlayerList
            players={bluePlayers.filter((p) => p.role === "operative")}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "operative")}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none"
            style={{ WebkitUserSelect: "none" }}
          >
            Join team
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Operatives
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "operative")}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "operative")}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none"
            style={{ WebkitUserSelect: "none" }}
          >
            Join team
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
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "spymaster")}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none"
            style={{ WebkitUserSelect: "none" }}
          >
            Join team
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Spymasters
          </p>
          <PlayerList
            players={redPlayers.filter((p) => p.role === "spymaster")}
          />
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "spymaster")}
            className="mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-4 text-base font-black uppercase tracking-[0.08em] text-white active:bg-[#24a85a] active:shadow-inner hover:shadow-lg touch-manipulation select-none"
            style={{ WebkitUserSelect: "none" }}
          >
            Join team
          </button>
        </section>
      </div>
    </>
  );
}
