import type { GameView } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import { BoardGrid } from "@/components/BoardGrid";

interface GameBoardSurfaceProps {
  game: GameView;
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
  canSelectCard,
  onSelectCard,
  onConfirmCard,
  selectedHintCardIds,
  onToggleHintCard,
  hideWords,
  selectedPlayersByCard,
}: GameBoardSurfaceProps) {
  return (
    <div className="mt-2 rounded-[10px] border border-white/15 bg-[#0879b8] p-1.5">
      <BoardGrid
        cards={game.board}
        role={game.role}
        selectedCardId={game.selectedCardId}
        canSelectCard={canSelectCard}
        onSelectCard={onSelectCard}
        onConfirmCard={onConfirmCard}
        selectedHintCardIds={selectedHintCardIds}
        onToggleHintCard={onToggleHintCard}
        hideWords={hideWords}
        selectedPlayersByCard={selectedPlayersByCard}
      />
    </div>
  );
}
