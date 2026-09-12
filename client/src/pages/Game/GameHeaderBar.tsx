import { useState } from "react";
import { Icon } from "@/components/Icon";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

interface GameHeaderBarProps {
  playerCount: number;
  roomCode: string;
  refreshingGame: boolean;
  onShowPlayers: () => void;
  onCopyRoomCode: () => void;
  onLeave: () => void;
  isRoomOwner: boolean;
  onResetGame: () => void;
  onRefresh: () => void;
}

export function GameHeaderBar({
  playerCount,
  roomCode,
  refreshingGame,
  onShowPlayers,
  onCopyRoomCode,
  onLeave,
  isRoomOwner,
  onResetGame,
  onRefresh,
}: GameHeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset" | "exit" | null>(
    null,
  );
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);

  return (
    <div className="sticky top-0 z-20 mb-1 flex items-center justify-between gap-1 border-b border-white/15 bg-inherit/95 py-1 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="ui-control flex h-10 w-10 shrink-0 items-center justify-center border-2 border-white/80 bg-black/10 text-xl font-bold text-white hover:bg-white/20"
          aria-label="Game navigation"
          title="Game navigation"
        >
          <Icon name="menu" />
        </button>
        <button
          type="button"
          onClick={onShowPlayers}
          className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-white/70 bg-[#1f5fae] px-2 text-sm font-bold transition hover:bg-white/15 active:scale-95"
          aria-label={`Show ${playerCount} players`}
          title="Show players"
        >
          <span aria-hidden="true" className="text-lg">
            👥
          </span>
          {playerCount}
        </button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshingGame}
          className="ui-control flex h-10 w-10 items-center justify-center border-2 border-white/80 bg-white/5 text-xl hover:bg-white/15"
          data-syncing={refreshingGame}
          aria-label="Refresh game"
          title="Sync game"
        >
          <Icon name="refresh" />
        </button>
        <button
          type="button"
          onClick={() => {
            const nextEnabled = !soundEnabled;
            setSoundEnabled(nextEnabled);
            setSoundEnabledState(nextEnabled);
          }}
          className="ui-control flex h-10 w-10 items-center justify-center border-2 border-white/80 bg-white/5 text-xl hover:bg-white/15"
          aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
        >
          <Icon name={soundEnabled ? "volume" : "volumeOff"} />
        </button>
        <button
          type="button"
          onClick={onCopyRoomCode}
          className="ui-control flex h-10 w-10 shrink-0 items-center justify-center border border-white/70 bg-white/10 text-xs font-black hover:bg-white/20"
          aria-label={`Copy room code ${roomCode}`}
          title="Copy room code"
        >
          <span aria-hidden="true" className="text-base">
            📋
          </span>
        </button>
      </div>
      {menuOpen ? (
        <div className="absolute left-2 top-14 z-30 w-52 rounded-2xl border-2 border-white/25 bg-[#242424]/95 p-1.5 text-left shadow-[0_14px_35px_rgba(0,0,0,0.45)] backdrop-blur-md">
          {isRoomOwner ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmAction("reset");
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white transition hover:bg-white/10"
            >
              Reset game
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmAction("exit");
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#ffb4aa] transition hover:bg-[#f4513f]/20"
          >
            Exit room
          </button>
        </div>
      ) : null}
      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[20vh]">
          <button
            type="button"
            aria-label="Close confirmation"
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          />
          <div className="relative w-full max-w-xs rounded-2xl border-2 border-white/25 bg-[#292929] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
            <h2 className="text-base font-black">
              {confirmAction === "reset" ? "Reset game?" : "Exit room?"}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {confirmAction === "reset"
                ? "This will return every player to the lobby."
                : "You will leave this room."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-white/25 px-3 py-2 text-sm font-bold text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  if (confirmAction === "reset") onResetGame();
                  else onLeave();
                }}
                className="rounded-lg bg-[#d84c3e] px-3 py-2 text-sm font-bold text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
