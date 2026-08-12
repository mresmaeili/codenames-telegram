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
    <div className="mb-2 flex items-center justify-center gap-3">
      {players.slice(0, 4).map((player) => (
        <div key={player.userId} className="flex flex-col items-center">
          <img
            src={avatarUrlForPlayer(player)}
            alt={player.displayName}
            title={player.displayName}
            className="h-9 w-9 rounded-full border border-white/20 object-cover"
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
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "operative")}
            className="relative mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-3 text-base font-black uppercase tracking-[0.08em] text-white"
          >
            <PlayerList players={bluePlayers} />
            {bluePlayers.filter((p) => p.role === "operative").length > 0 && (
              <div className="absolute left-1/2 top-7 -translate-x-1/2 transform flex max-w-[88%] items-center justify-center gap-3 overflow-hidden rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white">
                {bluePlayers
                  .filter((p) => p.role === "operative")
                  .map((p) => (
                    <div key={p.userId} className="flex items-center gap-2">
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span className="truncate max-w-30">{p.displayName}</span>
                    </div>
                  ))}
              </div>
            )}

            <span className="block text-sm">Join team</span>
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Operatives
          </p>
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "operative")}
            className="relative mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-3 text-base font-black uppercase tracking-[0.08em] text-white"
          >
            <PlayerList players={redPlayers} />
            {redPlayers.filter((p) => p.role === "operative").length > 0 && (
              <div className="absolute left-1/2 top-7 -translate-x-1/2 transform flex max-w-[88%] items-center justify-center gap-3 overflow-hidden rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white">
                {redPlayers
                  .filter((p) => p.role === "operative")
                  .map((p) => (
                    <div key={p.userId} className="flex items-center gap-2">
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span className="truncate max-w-30">{p.displayName}</span>
                    </div>
                  ))}
              </div>
            )}

            <span className="block text-sm">Join team</span>
          </button>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <section className="rounded-3xl bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Spymasters
          </p>
          <button
            type="button"
            onClick={() => onAssignmentChange("blue", "spymaster")}
            className="relative mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-3 text-base font-black uppercase tracking-[0.08em] text-white"
          >
            <PlayerList players={bluePlayers} />
            {bluePlayers.filter((p) => p.role === "spymaster").length > 0 && (
              <div className="absolute left-1/2 top-7 -translate-x-1/2 transform flex max-w-[88%] items-center justify-center gap-3 overflow-hidden rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white">
                {bluePlayers
                  .filter((p) => p.role === "spymaster")
                  .map((p) => (
                    <div key={p.userId} className="flex items-center gap-2">
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span className="truncate max-w-30">{p.displayName}</span>
                    </div>
                  ))}
              </div>
            )}
            <span className="block text-sm">Join team</span>
          </button>
        </section>

        <section className="rounded-3xl bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
          <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
            Spymasters
          </p>
          <button
            type="button"
            onClick={() => onAssignmentChange("red", "spymaster")}
            className="relative mt-3 w-full rounded-full bg-[#2cc86c] px-3 py-3 text-base font-black uppercase tracking-[0.08em] text-white"
          >
            <PlayerList players={redPlayers} />
            {redPlayers.filter((p) => p.role === "spymaster").length > 0 && (
              <div className="absolute left-1/2 top-7 -translate-x-1/2 transform flex max-w-[88%] items-center justify-center gap-3 overflow-hidden rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white">
                {redPlayers
                  .filter((p) => p.role === "spymaster")
                  .map((p) => (
                    <div key={p.userId} className="flex items-center gap-2">
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span className="truncate max-w-30">{p.displayName}</span>
                    </div>
                  ))}
              </div>
            )}
            <span className="block text-sm">Join team</span>
          </button>
        </section>
      </div>
    </>
  );
}
