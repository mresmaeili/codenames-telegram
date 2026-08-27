import type { Game } from "../../../shared/src/types/game.js";
import type { Room } from "../../../shared/src/types/room.js";

interface SelectionServiceContext {
  game: Pick<Game, "status" | "currentTurn" | "remainingGuesses"> & {
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
  cardId: string;
}

export interface SelectionValidationResult {
  ok: boolean;
  error?: string;
}

export interface SelectionSubmissionResult {
  game: SelectionServiceContext["game"];
}

export function validateCardSelection(
  context: SelectionServiceContext,
): SelectionValidationResult {
  if (context.game.status !== "active") {
    return { ok: false, error: "Game is not active." };
  }

  if (
    context.game.currentHintWord === null ||
    context.game.currentHintNumber === null
  ) {
    return {
      ok: false,
      error: "An active hint is required before selecting a card.",
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

  const card = context.game.board[Number.parseInt(context.cardId, 10)];
  if (!card) {
    return { ok: false, error: "Card does not exist." };
  }

  if (card.revealed) {
    return { ok: false, error: "Card has already been revealed." };
  }

  if (context.game.remainingGuesses <= 0) {
    return { ok: false, error: "No remaining guesses are available." };
  }

  return { ok: true };
}

export function applyCardSelection(
  context: SelectionServiceContext,
): SelectionSubmissionResult {
  const validation = validateCardSelection(context);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Unable to select card.");
  }

  const sender = context.room.players.find(
    (player) => player.telegramId === context.senderTelegramId,
  );

  if (!sender) {
    throw new Error("Sender is not part of the room.");
  }

  return {
    game: {
      ...context.game,
      selectedCardId: context.cardId,
      selectedByPlayerId: sender.userId,
      selectedAt: new Date(),
    },
  };
}
