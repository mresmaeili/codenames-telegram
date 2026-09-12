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
}: GameBoardSurfaceProps) {
  return (
    <div className="mt-2">
      <BoardGrid
        cards={game.board}
        role={game.role}
        selectedCardId={game.selectedCardId}
        selectedByPlayerId={game.selectedByPlayerId}
        viewerPlayerId={viewerPlayerId}
        canSelectCard={canSelectCard}
        onSelectCard={onSelectCard}
        onConfirmCard={onConfirmCard}
        selectedHintCardIds={selectedHintCardIds}
        hintTeam={game.currentTurn}
        onToggleHintCard={onToggleHintCard}
        hideWords={hideWords}
        selectedPlayersByCard={selectedPlayersByCard}
      />
    </div>
  );
}
