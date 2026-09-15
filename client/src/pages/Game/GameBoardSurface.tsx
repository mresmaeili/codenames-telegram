import type { GameView } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { BoardGrid } from "@/components/BoardGrid";

interface GameBoardSurfaceProps {
  game: GameView;
  viewerPlayerId?: string | null;
  canSelectCard: boolean;
  onSelectCard: (cardIndex: number) => void;
  onConfirmCard: (cardIndex: number) => void;
  selectedHintCardIds: Set<number>;
  onToggleHintCard?: (cardIndex: number) => void;
  hideWords: boolean;
  selectedPlayersByCard: Record<number, Room["players"]>;
  ownerIds: number[];
  wrongCardIndex: number | null;
  cardFeedback: "opponent" | "gray" | "assassin" | null;
}

export function GameBoardSurface({
  game,
  viewerPlayerId,
  canSelectCard,
  onSelectCard,
  onConfirmCard,
  selectedHintCardIds,
  onToggleHintCard,
  hideWords,
  selectedPlayersByCard,
  ownerIds,
  wrongCardIndex,
  cardFeedback,
}: GameBoardSurfaceProps) {
  return (
    <div>
      <BoardGrid
        cards={game.board}
        theme={game.theme}
        role={game.role}
        selectedCardId={game.selectedCardId}
        selectedByPlayerId={game.selectedByPlayerId}
        viewerPlayerId={viewerPlayerId}
        canSelectCard={canSelectCard}
        onSelectCard={onSelectCard}
        onConfirmCard={onConfirmCard}
        selectedHintCardIds={selectedHintCardIds}
        hintTeam={game.currentTurn}
        onToggleHintCard={
          game.status === "active" ? onToggleHintCard : undefined
        }
        revealAllWords={game.status === "finished"}
        hideWords={hideWords}
        selectedPlayersByCard={selectedPlayersByCard}
        ownerIds={ownerIds}
        wrongCardIndex={wrongCardIndex}
        cardFeedback={cardFeedback}
      />
    </div>
  );
}
