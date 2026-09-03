interface GameHeaderBarProps {
  playerCount: number;
  spectatorCount: number;
  operativeViewer: boolean;
  boardHidden: boolean;
  onLeave: () => void;
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
  onToggleBoard,
  onRules,
  onSettings,
}: GameHeaderBarProps) {
  return (
    <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-2 border-b border-white/15 bg-inherit/95 py-2 backdrop-blur-sm">
      <button
        type="button"
        onClick={onLeave}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-black/10 text-xl font-bold text-white hover:bg-white/20 active:bg-white/30"
        aria-label="Leave game"
        title="Leave game"
      >
        ×
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
          className="rounded-full border-2 border-white/80 bg-transparent px-4 py-2 text-sm font-bold"
        >
          Rules
        </button>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-transparent text-xl"
        aria-label="Game settings"
        title="Game settings"
      >
        ⚙
      </button>
    </div>
  );
}
