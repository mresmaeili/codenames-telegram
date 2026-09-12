interface TurnActionBarProps {
  hintWord: string | null;
  hintNumber: number | null;
  canPass: boolean;
  canTake: boolean;
  onPass: () => void;
  onTake: () => void;
}

export function TurnActionBar({
  hintWord,
  hintNumber,
  canPass,
  canTake,
  onPass,
  onTake,
}: TurnActionBarProps) {
  if (hintWord && hintNumber !== null) {
    return (
      <div className="relative z-20 mt-1 flex w-full shrink-0 items-center gap-1 rounded-[18px] border-2 border-[#121719] bg-[#292d30] px-1.5 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.4)] sm:mt-3 sm:gap-2 sm:rounded-2xl sm:px-2 sm:py-2">
        <div className="font-persian flex min-w-0 flex-1 items-center justify-center rounded-full border-2 border-[#d7d7d7] bg-white px-2 py-1 text-center text-lg font-bold uppercase tracking-tight text-[#222] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] sm:px-3 sm:py-2 sm:text-xl">
          {hintWord} ({hintNumber})
        </div>
        <div className="font-digital flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-[#159dce] text-lg font-normal text-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] sm:h-11 sm:w-11 sm:text-xl">
          {hintNumber}
        </div>
        {canPass || canTake ? (
          <button
            type="button"
            onClick={canTake ? onTake : onPass}
            className="flex h-9 w-11 items-center justify-center rounded-full border-2 border-[#b8ff8e] bg-[#51df20] px-2 py-1 text-xl font-black text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)] sm:h-11 sm:w-auto sm:px-4 sm:py-3 sm:text-sm"
            aria-label={canTake ? "Take turn" : "Pass turn"}
          >
            <span className="sm:hidden" aria-hidden="true">
              {canTake ? "↑" : "✓"}
            </span>
            <span className="hidden sm:inline">
              {canTake ? "Take turn" : "✓"}
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  if (canPass || canTake) {
    return (
      <div className="relative z-20 mt-3 flex shrink-0 items-center justify-end rounded-2xl border-2 border-white/25 bg-[#292929] px-3 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
        <button
          type="button"
          onClick={canTake ? onTake : onPass}
          className="rounded-full bg-[#51df20] px-4 py-3 text-sm font-black uppercase text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
          aria-label={canTake ? "Take turn" : "Pass turn"}
        >
          {canTake ? "Take turn" : "✓"}
        </button>
      </div>
    );
  }

  return null;
}
