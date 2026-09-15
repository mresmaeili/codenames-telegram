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
  const quickNumbers = Array.from({ length: 10 }, (_, index) => index);
  const selectedNumber = number || "0";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="relative z-20 mt-3 shrink-0 overflow-hidden rounded-[18px] border-[3px] border-[#202020] bg-[#292929] shadow-[0_5px_0_rgba(0,0,0,0.38),0_8px_16px_rgba(0,0,0,0.28)] backdrop-blur-sm animate-event-in sm:rounded-[20px]"
    >
      <div className="grid grid-cols-10 gap-0.5 border-b-2 border-[#171717] bg-[#363636] px-1 py-1 sm:gap-1 sm:px-1.5 sm:py-1.5">
        {quickNumbers.map((quickNumber) => {
          const isSelected = selectedNumber === String(quickNumber);
          return (
            <button
              key={quickNumber}
              type="button"
              aria-label={`Choose ${quickNumber} cards`}
              aria-pressed={isSelected}
              disabled={submitting}
              onClick={() =>
                onNumberChange(quickNumber === 0 ? "" : String(quickNumber))
              }
              className={`flex aspect-square w-full items-center justify-center rounded-full border-[3px] border-[#bfc4c8] bg-[#f7f8f8] text-[clamp(1.25rem,5vw,2.25rem)] font-black leading-none text-[#e44842] shadow-[inset_0_-3px_0_rgba(0,0,0,0.12),0_2px_3px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 hover:brightness-105 active:scale-90 ${isSelected ? "ring-2 ring-[#51df20] ring-offset-1 ring-offset-[#363636]" : ""}`}
            >
              {quickNumber}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 bg-[#292929] p-1.5 sm:gap-2 sm:p-2">
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
            className="font-persian h-12 w-full rounded-full border-[4px] border-[#171717] bg-white px-3 text-center text-3xl font-black uppercase leading-none text-black placeholder:text-[#444] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] transition-shadow focus:border-[#6ee51b] focus:outline-none focus:ring-4 focus:ring-[#6ee51b]/25 disabled:opacity-60 sm:h-14 sm:px-4 sm:text-4xl"
          />
        </div>

        <div className="relative shrink-0">
          <label htmlFor="hintNumber" className="sr-only">
            Number of Cards (1-25)
          </label>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#171717] bg-white text-3xl font-black text-[#e44842] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12),0_2px_3px_rgba(0,0,0,0.35)] transition-colors duration-200 sm:h-14 sm:w-14 sm:text-4xl">
            <span key={selectedNumber} className="animate-number-change">
              {selectedNumber}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !word.trim() || !number}
          aria-label="Send hint"
          className="flex h-12 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-[#9be783] bg-[#35b94b] px-2 text-3xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_0_#247b35] transition-transform hover:brightness-110 active:translate-y-0.5 active:scale-90 disabled:opacity-60 sm:h-14 sm:w-20 sm:px-3 sm:text-4xl"
        >
          {submitting ? "..." : "↑"}
        </button>
      </div>
    </form>
  );
}
