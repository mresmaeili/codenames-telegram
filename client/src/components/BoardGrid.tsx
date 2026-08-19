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
        const isSelectable = canSelectCard && !publicCard.revealed;
        const ariaLabel = publicCard.revealed
          ? `Revealed ${publicCard.word}`
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
              if (isSelectable && onConfirmCard) {
                onConfirmCard(index);
              }
            }}
            className={`block w-full transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) ${isSelectable ? "hover:-translate-y-0.5 hover:shadow-2xl" : "cursor-not-allowed opacity-70"}`}
            disabled={!isSelectable}
          >
            <BoardCard
              word={publicCard.word}
              hideWord={hideWords}
              disabled={!isSelectable}
              revealPlaceholder={false}
              selectedPlaceholder={selectedCardId === String(index)}
              revealedColor={publicCard.revealed ? publicCard.color : null}
            />
          </button>
        );
      })}
    </div>
  );
}
