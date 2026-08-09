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
  hideWords?: boolean;
}

export function BoardGrid({
  cards,
  role = "operative",
  selectedCardId,
  canSelectCard = false,
  onSelectCard,
  hideWords = false,
}: BoardGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
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
        return (
          <button
            key={`${publicCard.word}-${index}`}
            type="button"
            onClick={() => {
              if (canSelectCard && !publicCard.revealed && onSelectCard) {
                onSelectCard(index);
              }
            }}
            className="text-left"
            disabled={!canSelectCard || publicCard.revealed}
          >
            <BoardCard
              word={publicCard.word}
              hideWord={hideWords}
              disabled={!canSelectCard || publicCard.revealed}
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
