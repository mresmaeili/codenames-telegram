import { BoardCard } from "@/components/BoardCard";
import { SpymasterCard } from "@/components/SpymasterCard";
import { Icon } from "@/components/Icon";
import { playActionSound } from "@/lib/sound";
import { useState } from "react";
import type {
  PublicCard,
  SpymasterCard as SpymasterCardModel,
  Turn,
} from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import type { GameTheme } from "@/../shared/src/types/theme";
import { persianRevealAsset } from "@/lib/persianRevealAssets";
import { memeRevealAsset } from "@/lib/memeRevealAssets";
import touchCardIcon from "@/assets/icon-touch-card.svg";

function revealAssetForTheme(
  theme: GameTheme | undefined,
  color: "red" | "blue" | "neutral" | "assassin" | null,
  cardIndex: number,
): string | null {
  if (theme === "meme") return memeRevealAsset(color);
  return persianRevealAsset(theme, color, cardIndex);
}

interface BoardGridProps {
  cards: PublicCard[] | SpymasterCardModel[];
  role?: "operative" | "spymaster";
  selectedCardId?: string | null;
  selectedByPlayerId?: string | null;
  viewerPlayerId?: string | null;
  canSelectCard?: boolean;
  onSelectCard?: (cardIndex: number) => void;
  onConfirmCard?: (cardIndex: number) => void;
  selectedHintCardIds?: Set<number>;
  onToggleHintCard?: (cardIndex: number) => void;
  hintTeam?: Turn;
  hideWords?: boolean;
  selectedPlayersByCard?: Record<number, Room["players"]>;
  ownerIds?: number[];
  wrongCardIndex?: number | null;
  cardFeedback?: "opponent" | "gray" | "assassin" | null;
  revealAllWords?: boolean;
  theme?: GameTheme;
}

export function BoardGrid({
  cards,
  role = "operative",
  selectedCardId,
  selectedByPlayerId,
  viewerPlayerId,
  canSelectCard = false,
  onSelectCard,
  onConfirmCard,
  selectedHintCardIds = new Set(),
  onToggleHintCard,
  hintTeam,
  hideWords = false,
  selectedPlayersByCard = {},
  ownerIds = [],
  wrongCardIndex = null,
  cardFeedback = null,
  revealAllWords = false,
  theme,
}: BoardGridProps) {
  const [visibleRevealedWords, setVisibleRevealedWords] = useState<Set<number>>(
    new Set(),
  );
  const [revealedWordAnimations, setRevealedWordAnimations] = useState<
    Record<number, number>
  >({});
  const [revealedWordAnimationDirections, setRevealedWordAnimationDirections] =
    useState<Record<number, "open" | "close">>({});
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 lg:gap-2">
      {cards.map((card, index) => {
        if (role === "spymaster") {
          const spymasterCard = card as SpymasterCardModel;
          const canSelectHintCard =
            !spymasterCard.revealed && spymasterCard.color === hintTeam;
          return (
            <SpymasterCard
              key={`${spymasterCard.word}-${index}`}
              word={spymasterCard.word}
              color={spymasterCard.color}
              revealed={spymasterCard.revealed}
              showRevealedWord={visibleRevealedWords.has(index)}
              revealAnimationKey={revealedWordAnimations[index] ?? 0}
              revealAnimationDirection={revealedWordAnimationDirections[index]}
              revealAsset={
                spymasterCard.revealed
                  ? revealAssetForTheme(theme, spymasterCard.color, index)
                  : null
              }
              theme={theme}
              selectedPlayers={selectedPlayersByCard[index] ?? []}
              ownerIds={ownerIds}
              selected={canSelectHintCard && selectedHintCardIds.has(index)}
              onClick={
                spymasterCard.revealed
                  ? () => {
                      const isWordVisible = visibleRevealedWords.has(index);
                      setVisibleRevealedWords((current) => {
                        const next = new Set(current);
                        if (isWordVisible) next.delete(index);
                        else next.add(index);
                        return next;
                      });
                      setRevealedWordAnimations((current) => ({
                        ...current,
                        [index]: (current[index] ?? 0) + 1,
                      }));
                      setRevealedWordAnimationDirections((current) => ({
                        ...current,
                        [index]: isWordVisible ? "close" : "open",
                      }));
                    }
                  : canSelectHintCard && onToggleHintCard
                    ? () => {
                        playActionSound("select", theme);
                        onToggleHintCard(index);
                      }
                    : undefined
              }
            />
          );
        }

        const publicCard = card as PublicCard;
        const isEndGameCard = revealAllWords && publicCard.color !== null;
        const canToggleRevealedCard = publicCard.revealed || isEndGameCard;
        const isSelected = canSelectCard && selectedCardId === String(index);
        const localSelectedPlayers = selectedPlayersByCard[index] ?? [];
        const hasLocalSelection =
          canSelectCard && localSelectedPlayers.length > 0;
        const hasOwnLocalSelection = localSelectedPlayers.some(
          (player) => player.userId === viewerPlayerId,
        );
        const isSelectable = canSelectCard && !publicCard.revealed;
        const isConfirmable =
          role === "operative" && hasOwnLocalSelection && !publicCard.revealed;
        const isInteractive = isSelectable || isConfirmable;
        const isRevealedWordVisible = visibleRevealedWords.has(index);
        const ariaLabel = canToggleRevealedCard
          ? isRevealedWordVisible
            ? `Hide revealed word ${publicCard.word}`
            : `Show revealed word ${publicCard.word}`
          : isConfirmable
            ? `Selected ${publicCard.word}. Use the hand button to confirm.`
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
                if (isSelectable && onSelectCard) {
                  playActionSound("select", theme);
                  onSelectCard(index);
                } else if (canToggleRevealedCard) {
                  const isWordVisible = visibleRevealedWords.has(index);
                  setVisibleRevealedWords((current) => {
                    const next = new Set(current);
                    if (isWordVisible) next.delete(index);
                    else next.add(index);
                    return next;
                  });
                  setRevealedWordAnimations((current) => ({
                    ...current,
                    [index]: (current[index] ?? 0) + 1,
                  }));
                  setRevealedWordAnimationDirections((current) => ({
                    ...current,
                    [index]: isWordVisible ? "close" : "open",
                  }));
                }
              }}
              className={`group block w-full touch-manipulation select-none transition duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) ${isInteractive || (canToggleRevealedCard && (canSelectCard || revealAllWords)) ? "hover:-translate-y-0.5 hover:shadow-2xl" : "cursor-default"}`}
              disabled={!isSelectable && !canToggleRevealedCard}
            >
              <BoardCard
                word={publicCard.word}
                hideWord={hideWords}
                disabled={false}
                revealPlaceholder={false}
                revealedColor={publicCard.color}
                showRevealedWord={
                  isRevealedWordVisible ||
                  (revealAllWords && !publicCard.revealed)
                }
                revealAnimationKey={revealedWordAnimations[index] ?? 0}
                revealAnimationDirection={
                  revealedWordAnimationDirections[index]
                }
                theme={theme}
                selectedPlaceholder={isSelected || hasLocalSelection}
                selectedPlayers={selectedPlayersByCard[index] ?? []}
                revealAsset={
                  publicCard.revealed
                    ? revealAssetForTheme(theme, publicCard.color, index)
                    : null
                }
              />
            </button>
            {isConfirmable ? (
              <button
                type="button"
                aria-label={`Confirm ${publicCard.word}`}
                onClick={(event) => {
                  event.stopPropagation();
                  playActionSound("confirm", theme);
                  onConfirmCard?.(index);
                }}
                className="game-card-confirm-button absolute -right-1 -top-2 z-10 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border-2 border-[#b8ff8e] bg-gradient-to-b from-[#74e84d] to-[#2db814] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_3px_8px_rgba(0,0,0,0.5)] transition-transform duration-150 hover:scale-110 active:scale-90"
              >
                <img
                  src={touchCardIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                />
                <span className="sr-only">Confirm selection</span>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
