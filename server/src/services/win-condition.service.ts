import type {
  Game,
  GameCompletionReason,
  Turn,
} from "../../../shared/src/types/game.js";
import type { Room } from "../../../shared/src/types/room.js";

interface WinConditionContext {
  game: Pick<Game, "status" | "currentTurn" | "startingTeam"> & {
    remainingGuesses: number;
    currentHintWord: string | null;
    currentHintNumber: number | null;
    hintSubmittedAt: Date | null;
    board: Array<{ word: string; color: string | null; revealed: boolean }>;
    selectedCardId: string | null;
    selectedByPlayerId: string | null;
    selectedAt: Date | null;
    winningTeam: Turn | null;
    completionReason: GameCompletionReason | null;
    completedAt: Date | null;
  };
  room?: Pick<Room, "players">;
  senderTelegramId?: number;
}

export interface WinConditionResult {
  completed: boolean;
  winningTeam: Turn | null;
  completionReason: GameCompletionReason | null;
}

export interface GameActionValidationResult {
  ok: boolean;
  error?: string;
}

function getOpposingTeam(team: Turn): Turn {
  return team === "red" ? "blue" : "red";
}

export function evaluateGameCompletion(
  context: WinConditionContext,
): WinConditionResult {
  if (
    context.game.status === "finished" &&
    context.game.winningTeam !== null &&
    context.game.completionReason !== null
  ) {
    return {
      completed: true,
      winningTeam: context.game.winningTeam,
      completionReason: context.game.completionReason,
    };
  }

  const revealedAssassin = context.game.board.some(
    (card) => card.revealed && card.color === "assassin",
  );

  if (revealedAssassin) {
    return {
      completed: true,
      winningTeam: getOpposingTeam(context.game.currentTurn),
      completionReason: "assassin-revealed",
    };
  }

  for (const team of ["red", "blue"] as const) {
    const teamCards = context.game.board.filter((card) => card.color === team);
    if (teamCards.length > 0 && teamCards.every((card) => card.revealed)) {
      return {
        completed: true,
        winningTeam: team,
        completionReason: `all-${team}-cards-revealed`,
      };
    }
  }

  return {
    completed: false,
    winningTeam: null,
    completionReason: null,
  };
}

export function validateGameplayAction(
  context: WinConditionContext,
): GameActionValidationResult {
  if (context.game.status !== "active") {
    return { ok: false, error: "Game has already finished." };
  }

  return { ok: true };
}

export function applyGameCompletion(context: WinConditionContext): {
  game: WinConditionContext["game"];
  completed: boolean;
  winningTeam: Turn | null;
  completionReason: GameCompletionReason | null;
} {
  const result = evaluateGameCompletion(context);

  if (!result.completed) {
    return {
      game: context.game,
      completed: false,
      winningTeam: null,
      completionReason: null,
    };
  }

  return {
    game: {
      ...context.game,
      status: "finished",
      remainingGuesses: 0,
      currentHintWord: null,
      currentHintNumber: null,
      hintSubmittedAt: null,
      selectedCardId: null,
      selectedByPlayerId: null,
      selectedAt: null,
      winningTeam: result.winningTeam,
      completionReason: result.completionReason,
      completedAt: new Date(),
    },
    completed: true,
    winningTeam: result.winningTeam,
    completionReason: result.completionReason,
  };
}
