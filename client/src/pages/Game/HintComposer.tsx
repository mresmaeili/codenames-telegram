interface HintComposerProps {
  word: string;
  number: string;
  submitting: boolean;
  onWordChange: (word: string) => void;
  onNumberChange: (number: string) => void;
  onSubmit: () => void;
}

export function HintComposer({
  word,
  number,
  submitting,
  onWordChange,
  onNumberChange,
  onSubmit,
}: HintComposerProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="sticky bottom-2 z-20 mt-3 flex items-center gap-2 rounded-[18px] border-2 border-[#555] bg-[#292929] p-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="hintWord" className="sr-only">
          Hint Word
        </label>
        <input
          id="hintWord"
          type="text"
          value={word}
          onChange={(event) => onWordChange(event.target.value)}
          placeholder="Enter one word (no spaces)"
          disabled={submitting}
          className="w-full rounded-full border-2 border-[#c8c8c8] bg-white px-4 py-2 text-center text-xl font-black uppercase text-black placeholder:text-[#444] disabled:opacity-60"
          autoFocus
        />
      </div>

      <div className="relative shrink-0">
        <label htmlFor="hintNumber" className="sr-only">
          Number of Cards (1-25)
        </label>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#159dce] text-xl font-black text-white">
          {number || "0"}
        </div>
        <select
          id="hintNumber"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          disabled={submitting}
          aria-label="Hint card count"
          className="absolute inset-0 h-11 w-11 cursor-pointer opacity-0"
        >
          <option value="">0</option>
          {Array.from({ length: 25 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting || !word.trim() || !number}
        aria-label="Send hint"
        className="flex h-11 w-14 shrink-0 items-center justify-center rounded-full bg-[#51df20] px-3 text-2xl font-black text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)] disabled:opacity-60"
      >
        {submitting ? "..." : "↑"}
      </button>
    </form>
  );
}
