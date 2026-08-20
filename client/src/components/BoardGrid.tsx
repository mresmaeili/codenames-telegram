import { BoardCard } from "@/components/BoardCard";
import { SpymasterCard } from "@/components/SpymasterCard";
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
        const ariaLabel = publicCard.revealed
          ? `Revealed ${publicCard.word}`
          : isConfirmable
            ? `Confirm ${publicCard.word}`
            : isSelectable
              ? `Select ${publicCard.word}`
              : `Locked ${publicCard.word}`;

        return (
          <button
            key={`${publicCard.word}-${index}`}
            type="button"
            aria-label={ariaLabel}
            onClick={() => {
              if (isSelectable && onSelectCard) {
                onSelectCard(index);
              }
            }}
            onDoubleClick={() => {
              if (isConfirmable && onConfirmCard) {
                onConfirmCard(index);
              }
            }}
            className={`relative block w-full transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) ${isInteractive ? "hover:-translate-y-0.5 hover:shadow-2xl" : "cursor-not-allowed opacity-70"}`}
            disabled={!isInteractive}
          >
            <BoardCard
              word={publicCard.word}
              hideWord={hideWords}
              disabled={!isInteractive}
              revealPlaceholder={false}
              selectedPlaceholder={isSelected}
              revealedColor={publicCard.revealed ? publicCard.color : null}
            />
            {isConfirmable ? (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Confirm ${publicCard.word}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmCard?.(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onConfirmCard?.(index);
                  }
                }}
                className="absolute right-1 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#43d61b] text-xl shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
              >
                ☝
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
