import { BoardCard } from "@/components/BoardCard";
import { SpymasterCard } from "@/components/SpymasterCard";
import { useState } from "react";
import type {
  PublicCard,
  SpymasterCard as SpymasterCardModel,
} from "@/../shared/src/types/game";

interface BoardGridProps {
  cards: PublicCard[] | SpymasterCardModel[];
  role?: "operative" | "spymaster";
  selectedCardId?: string | null;
  canSelectCard?: boolean;
  onSelectCard?: (cardIndex: number) => void;
  onConfirmCard?: (cardIndex: number) => void;
  hideWords?: boolean;
}

export function BoardGrid({
  cards,
  role = "operative",
  selectedCardId,
  canSelectCard = false,
  onSelectCard,
  onConfirmCard,
  hideWords = false,
}: BoardGridProps) {
  const [visibleRevealedWords, setVisibleRevealedWords] = useState<Set<number>>(
    new Set(),
  );

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {cards.map((card, index) => {
        if (role === "spymaster") {
          const spymasterCard = card as SpymasterCardModel;
          return (
            <SpymasterCard
              key={`${spymasterCard.word}-${index}`}
              word={spymasterCard.word}
              color={spymasterCard.color}
              revealed={spymasterCard.revealed}
            />
          );
        }

        const publicCard = card as PublicCard;
        const isSelected = selectedCardId === String(index);
        const isSelectable = canSelectCard && !publicCard.revealed;
        const isConfirmable = isSelected && !publicCard.revealed;
        const isInteractive = isSelectable || isConfirmable;
        const isRevealedWordVisible = visibleRevealedWords.has(index);
        const ariaLabel = publicCard.revealed
          ? `Revealed ${publicCard.word}`
          : isConfirmable
            ? `Confirm ${publicCard.word}`
            : isSelectable
              ? `Select ${publicCard.word}`
              : `Locked ${publicCard.word}`;

        return (
          <div
            key={`${publicCard.word}-${index}-${publicCard.revealed ? (publicCard.color ?? "neutral") : "hidden"}`}
            className="relative"
          >
            <button
              type="button"
              aria-label={ariaLabel}
              onClick={() => {
                if (isConfirmable && onConfirmCard) {
                  onConfirmCard(index);
                } else if (isSelectable && onSelectCard) {
                  onSelectCard(index);
                } else if (publicCard.revealed) {
                  setVisibleRevealedWords((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  });
                }
              }}
              className={`block w-full transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) ${isInteractive || publicCard.revealed ? "hover:-translate-y-0.5 hover:shadow-2xl" : "cursor-not-allowed opacity-70"}`}
              disabled={!isSelectable && !publicCard.revealed}
            >
              <BoardCard
                word={publicCard.word}
                hideWord={hideWords}
                disabled={!isInteractive}
                revealPlaceholder={false}
                selectedPlaceholder={isSelected}
                revealedColor={
                  publicCard.revealed ? (publicCard.color ?? "neutral") : null
                }
                showRevealedWord={isRevealedWordVisible}
              />
            </button>
            {isConfirmable ? (
              <button
                type="button"
                aria-label={`Confirm ${publicCard.word}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmCard?.(index);
                }}
                className="absolute right-1 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#43d61b] text-xl shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
              >
                ☝
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
