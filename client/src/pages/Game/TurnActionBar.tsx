interface TurnActionBarProps {
  hintWord: string | null;
  hintNumber: number | null;
  remainingGuesses: number;
  canPass: boolean;
  canTake: boolean;
  activeOperative: boolean;
  onPass: () => void;
  onTake: () => void;
}

export function TurnActionBar({
  hintWord,
  hintNumber,
  remainingGuesses,
  canPass,
  canTake,
  activeOperative,
  onPass,
  onTake,
}: TurnActionBarProps) {
  if (hintWord && hintNumber !== null) {
    return (
      <div className="sticky bottom-2 z-20 mt-3 flex items-center gap-2 rounded-2xl border-2 border-white/25 bg-[#292929] px-2 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
        <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-white px-3 py-2 text-center text-xl font-black uppercase tracking-tight text-black">
          {hintWord} ({hintNumber})
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-[#159dce] text-xl font-black">
          {remainingGuesses}
        </div>
        {canPass || canTake ? (
          <button
            type="button"
            onClick={canTake ? onTake : onPass}
            className="rounded-full bg-[#51df20] px-4 py-3 text-sm font-black uppercase text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
            aria-label={canTake ? "Take turn" : "Pass turn"}
          >
            {canTake ? "Take turn" : "Pass"}
          </button>
        ) : null}
      </div>
    );
  }

  if (canPass || canTake) {
    return (
      <div className="sticky bottom-2 z-20 mt-3 flex items-center justify-end rounded-2xl border-2 border-white/25 bg-[#292929] px-3 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
        <button
          type="button"
          onClick={canTake ? onTake : onPass}
          className="rounded-full bg-[#51df20] px-4 py-3 text-sm font-black uppercase text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
          aria-label={canTake ? "Take turn" : "Pass turn"}
        >
          {canTake ? "Take turn" : "Pass"}
        </button>
      </div>
    );
  }

  return activeOperative ? (
    <div className="mt-4 flex items-center gap-3 rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
      <div className="flex-1 px-2 text-left text-sm font-semibold text-white/80">
        Your spymaster has not given a clue yet.
      </div>
    </div>
  ) : null;
}
