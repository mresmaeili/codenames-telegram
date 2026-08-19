import type { Game } from "../../../shared/src/types/game.js";
import type { Room } from "../../../shared/src/types/room.js";

interface TurnServiceContext {
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
  revealedCardColor?: string | null;
}

export interface TurnValidationResult {
  ok: boolean;
  error?: string;
}

export interface TurnSubmissionResult {
  game: TurnServiceContext["game"];
}

function getOpposingTeam(team: "red" | "blue"): "red" | "blue" {
  return team === "red" ? "blue" : "red";
}

export function validateTurnPass(
  context: TurnServiceContext,
): TurnValidationResult {
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

  if (sender.role !== "operative") {
    return { ok: false, error: "Sender must be an operative." };
  }

  return { ok: true };
}

export function applyTurnPass(
  context: TurnServiceContext,
): TurnSubmissionResult {
  const validation = validateTurnPass(context);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Unable to pass turn.");
  }

  return {
    game: {
      ...context.game,
      currentTurn: getOpposingTeam(context.game.currentTurn),
      remainingGuesses: 0,
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
    },
  };
}

export function applyTurnOutcome(
  context: TurnServiceContext,
): TurnSubmissionResult {
  const validation = validateTurnPass(context);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Unable to resolve turn outcome.");
  }

  const revealedCardColor = context.revealedCardColor;

  if (revealedCardColor === context.game.currentTurn) {
    const remainingGuesses = Math.max(0, context.game.remainingGuesses - 1);
    if (remainingGuesses === 0) {
      return {
        game: {
          ...context.game,
          currentTurn: getOpposingTeam(context.game.currentTurn),
          remainingGuesses: 0,
          currentHintWord: null,
          currentHintNumber: null,
          hintSubmittedAt: null,
          selectedCardId: null,
          selectedByPlayerId: null,
          selectedAt: null,
        },
      };
    }

    return {
      game: {
        ...context.game,
        remainingGuesses,
        selectedCardId: null,
        selectedByPlayerId: null,
        selectedAt: null,
      },
    };
  }

  if (revealedCardColor === "neutral") {
    return {
      game: {
        ...context.game,
        currentTurn: getOpposingTeam(context.game.currentTurn),
        remainingGuesses: 0,
        currentHintWord: null,
        currentHintNumber: null,
        hintSubmittedAt: null,
        selectedCardId: null,
        selectedByPlayerId: null,
        selectedAt: null,
      },
    };
  }

  if (revealedCardColor === "assassin") {
    return {
      game: {
        ...context.game,
        remainingGuesses: 0,
        currentHintWord: null,
        currentHintNumber: null,
        hintSubmittedAt: null,
        selectedCardId: null,
        selectedByPlayerId: null,
        selectedAt: null,
      },
    };
  }

  return {
    game: {
      ...context.game,
      currentTurn: getOpposingTeam(context.game.currentTurn),
      remainingGuesses: 0,
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
    },
  };
}
