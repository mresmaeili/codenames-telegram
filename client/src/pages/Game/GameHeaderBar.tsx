import { useState } from "react";

interface GameHeaderBarProps {
  playerCount: number;
  spectatorCount: number;
  operativeViewer: boolean;
  boardHidden: boolean;
  onLeave: () => void;
  onReturnToLobby: () => void;
  onToggleBoard: () => void;
  onRules: () => void;
  onSettings: () => void;
}

export function GameHeaderBar({
  playerCount,
  spectatorCount,
  operativeViewer,
  boardHidden,
  onLeave,
  onReturnToLobby,
  onToggleBoard,
  onRules,
  onSettings,
}: GameHeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-20 mb-2 flex items-center justify-between gap-2 border-b border-white/15 bg-inherit/95 py-2 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-black/10 text-xl font-bold text-white transition hover:bg-white/20 active:scale-95"
        aria-label="Game navigation"
        title="Game navigation"
      >
        ⋮
      </button>
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex h-10 items-center gap-1 rounded-full border border-white/70 bg-[#1f5fae] px-3 text-sm font-bold">
          <span aria-hidden="true" className="text-lg">
            👥
          </span>
          {playerCount}
        </div>
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
        {operativeViewer ? (
          <button
            type="button"
            onClick={onToggleBoard}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/70 text-lg ${boardHidden ? "bg-[#51df20]" : "bg-[#1f5fae]"}`}
            aria-label={boardHidden ? "Show board words" : "Hide board words"}
            title={boardHidden ? "Show board words" : "Hide board words"}
          >
            {boardHidden ? "🙈" : "👁"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRules}
          className="rounded-full border-2 border-white/80 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/15 active:scale-95"
        >
          Rules
        </button>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-white/5 text-xl transition hover:bg-white/15 active:scale-95"
        aria-label="Game settings"
        title="Game settings"
      >
        ⚙
      </button>
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
