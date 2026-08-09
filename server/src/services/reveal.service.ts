import type { Game } from "../../../shared/src/types/game.js";
import type { Room } from "../../../shared/src/types/room.js";

interface RevealServiceContext {
  game: Pick<Game, "status" | "currentTurn"> & {
    remainingGuesses: number;
    currentHintWord: string | null;
    currentHintNumber: number | null;
    hintSubmittedAt: Date | null;
    board: Array<{ word: string; color: string | null; revealed: boolean }>;
    selectedCardId: string | null;
    selectedByPlayerId: string | null;
    selectedAt: Date | null;
  };
  room: Pick<Room, "players">;
  senderTelegramId: number;
}

export interface RevealValidationResult {
  ok: boolean;
  error?: string;
}

export interface RevealSubmissionResult {
  game: RevealServiceContext["game"];
}

export function validateCardReveal(
  context: RevealServiceContext,
): RevealValidationResult {
  if (context.game.status !== "active") {
    return { ok: false, error: "Game is not active." };
  }

  if (
    context.game.currentHintWord === null ||
    context.game.currentHintNumber === null
  ) {
    return {
      ok: false,
      error: "An active hint is required before revealing a card.",
    };
  }

  const sender = context.room.players.find(
    (player) => player.telegramId === context.senderTelegramId,
  );

  if (!sender) {
    return { ok: false, error: "Sender is not part of the room." };
  }

  if (sender.team !== context.game.currentTurn) {
    return { ok: false, error: "Sender must belong to the active team." };
  }

  if (sender.role !== "operative") {
    return { ok: false, error: "Sender must be an operative." };
  }

  if (context.game.selectedCardId === null) {
    return {
      ok: false,
      error: "A selected card is required before revealing.",
    };
  }

  const cardIndex = Number.parseInt(context.game.selectedCardId, 10);
  const selectedCard = context.game.board[cardIndex];

  if (!selectedCard) {
    return { ok: false, error: "Selected card does not exist." };
  }

  if (selectedCard.revealed) {
    return { ok: false, error: "Selected card has already been revealed." };
  }

  return { ok: true };
}

export function applyCardReveal(
  context: RevealServiceContext,
): RevealSubmissionResult {
  const validation = validateCardReveal(context);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Unable to reveal card.");
  }

  const cardIndex = Number.parseInt(context.game.selectedCardId ?? "", 10);
  const selectedCard = context.game.board[cardIndex];

  if (!selectedCard) {
    throw new Error("Selected card does not exist.");
  }

  const nextBoard = context.game.board.map((card, index) =>
    index === cardIndex ? { ...card, revealed: true } : card,
  );

  return {
    game: {
      ...context.game,
      board: nextBoard,
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
    },
  };
}
