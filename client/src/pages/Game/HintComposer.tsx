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
      className="relative z-20 mt-3 flex shrink-0 items-center gap-1 rounded-[16px] border-2 border-[#555] bg-[#292929]/95 p-1 shadow-[0_4px_14px_rgba(0,0,0,0.4)] backdrop-blur-sm animate-event-in sm:gap-2 sm:rounded-[18px] sm:p-1.5"
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
          placeholder="Your clue"
          disabled={submitting}
          className="font-persian w-full rounded-full border-2 border-[#c8c8c8] bg-white px-3 py-1 text-center text-3xl font-black uppercase leading-none text-black placeholder:text-[#444] transition-shadow focus:border-[#6ee51b] focus:outline-none focus:ring-4 focus:ring-[#6ee51b]/25 disabled:opacity-60 sm:px-4 sm:py-2 sm:text-4xl"
        />
      </div>

      <div className="relative shrink-0">
        <label htmlFor="hintNumber" className="sr-only">
          Number of Cards (1-25)
        </label>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#159dce] text-lg font-black text-white sm:h-11 sm:w-11 sm:text-xl">
          {number || "0"}
        </div>
        <select
          id="hintNumber"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          disabled={submitting}
          aria-label="Hint card count"
          className="absolute inset-0 h-9 w-9 cursor-pointer opacity-0 sm:h-11 sm:w-11"
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
        className="flex h-9 w-12 shrink-0 items-center justify-center rounded-full bg-[#51df20] px-2 text-xl font-black text-white shadow-[0_2px_5px_rgba(0,0,0,0.35)] transition-transform hover:brightness-110 active:scale-90 disabled:opacity-60 sm:h-11 sm:w-14 sm:px-3 sm:text-2xl"
      >
        {submitting ? "..." : "↑"}
      </button>
    </form>
  );
}
