import type { Game } from "../../../shared/src/types/game.js";
import type { Room } from "../../../shared/src/types/room.js";

interface HintServiceContext {
  game: Pick<Game, "status" | "currentTurn" | "remainingGuesses"> & {
    currentHintWord: string | null;
    currentHintNumber: number | null;
    hintSubmittedAt: Date | null;
  };
  room: Pick<Room, "players">;
  senderTelegramId: number;
  word: string;
  number: number;
}

export interface HintValidationResult {
  ok: boolean;
  error?: string;
}

export interface HintSubmissionResult {
  game: HintServiceContext["game"];
}

export function validateHintSubmission(
  context: HintServiceContext,
): HintValidationResult {
  if (context.game.status !== "active") {
    return { ok: false, error: "Game is not active." };
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

  if (sender.role !== "spymaster") {
    return { ok: false, error: "Sender must be the team's spymaster." };
  }

  if (typeof context.word !== "string" || context.word.trim().length === 0) {
    return { ok: false, error: "Hint word cannot be empty." };
  }

  if (!Number.isInteger(context.number) || context.number <= 0) {
    return { ok: false, error: "Hint number must be a positive integer." };
  }

  if (
    context.game.currentHintWord !== null ||
    context.game.currentHintNumber !== null
  ) {
    return { ok: false, error: "A hint is already active." };
  }

  return { ok: true };
}

export function applyHintSubmission(
  context: HintServiceContext,
): HintSubmissionResult {
  const validation = validateHintSubmission(context);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Unable to submit hint.");
  }

  return {
    game: {
      ...context.game,
      currentHintWord: context.word.trim(),
      currentHintNumber: context.number,
      remainingGuesses: context.number,
      hintSubmittedAt: new Date(),
    },
  };
}
