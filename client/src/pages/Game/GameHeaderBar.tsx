import { useState } from "react";
import { Icon } from "@/components/Icon";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

interface GameHeaderBarProps {
  playerCount: number;
  spectatorCount: number;
  refreshingGame: boolean;
  onShowPlayers: () => void;
  onLeave: () => void;
  onReturnToLobby: () => void;
  onRefresh: () => void;
  onCopyRoomCode: () => void;
  onSettings: () => void;
}

export function GameHeaderBar({
  playerCount,
  spectatorCount,
  refreshingGame,
  onShowPlayers,
  onLeave,
  onReturnToLobby,
  onRefresh,
  onCopyRoomCode,
  onSettings,
}: GameHeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);

  return (
    <div className="sticky top-0 z-20 mb-1 flex items-center justify-between gap-1 border-b border-white/15 bg-inherit/95 py-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="ui-control flex h-10 w-10 items-center justify-center border-2 border-white/80 bg-black/10 text-xl font-bold text-white hover:bg-white/20"
        aria-label="Game navigation"
        title="Game navigation"
      >
        <Icon name="menu" />
      </button>
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onShowPlayers}
          className="flex h-10 items-center gap-1 rounded-full border border-white/70 bg-[#1f5fae] px-3 text-sm font-bold transition hover:bg-white/15 active:scale-95"
          aria-label={`Show ${playerCount} players`}
          title="Show players"
        >
          <span aria-hidden="true" className="text-lg">
            👥
          </span>
          {playerCount}
        </button>
        {spectatorCount > 0 ? (
          <div
            className="flex h-10 items-center gap-1 rounded-full border border-white/50 bg-white/10 px-2 text-sm font-bold"
            aria-label={`${spectatorCount} spectators`}
            title="Spectators"
          >
            <span aria-hidden="true">👁</span>
            {spectatorCount}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshingGame}
          className="ui-control flex h-10 w-10 items-center justify-center border-2 border-white/80 bg-white/5 text-xl hover:bg-white/15"
          data-syncing={refreshingGame}
          aria-label="Refresh game"
          title="Sync game"
        >
          <Icon name="refresh" /> <span className="sr-only">Sync</span>
        </button>
        <button
          type="button"
          onClick={onCopyRoomCode}
          className="ui-control flex h-10 items-center gap-1 border border-white/70 bg-white/10 px-2.5 text-xs font-black hover:bg-white/20"
          aria-label="Copy room code"
          title="Copy room code"
        >
          <Icon name="copy" size={15} />
          Code
        </button>
      </div>
      <div className="flex items-center gap-1">
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
          onClick={onSettings}
          className="ui-control flex h-10 w-10 items-center justify-center border-2 border-white/80 bg-white/5 text-xl hover:bg-white/15"
          aria-label="Game settings"
          title="Game settings"
        >
          <Icon name="settings" />
        </button>
      </div>
      {menuOpen ? (
        <div className="absolute left-2 top-14 z-30 w-52 rounded-2xl border-2 border-white/25 bg-[#242424]/95 p-1.5 text-left shadow-[0_14px_35px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onReturnToLobby();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white transition hover:bg-white/10"
          >
            Return to lobby
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLeave();
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#ffb4aa] transition hover:bg-[#f4513f]/20"
          >
            Exit room
          </button>
        </div>
      ) : null}
    </div>
  );
}
