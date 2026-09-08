import type { GameDocument } from "../models/game.model.js";
import { RoomModel, type RoomDocument } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { applyHintSubmission } from "./hint.service.js";
import { applyCardSelection } from "./selection.service.js";
import { applyTurnPass } from "./turn.service.js";
import { applyCardReveal } from "./reveal.service.js";
import { applyGameCompletion } from "./win-condition.service.js";
import { applyTurnOutcome } from "./turn.service.js";
import { getRemainingCardCounts } from "./game.service.js";

export interface SubmitHintCommand {
  gameId: string;
  roomCode?: string;
  telegramId: number;
  word: string;
  number: number;
}

export interface SelectCardCommand {
  gameId: string;
  roomCode?: string;
  telegramId: number;
  cardId: string;
}

export interface PassTurnCommand {
  gameId: string;
  roomCode?: string;
  telegramId: number;
}

export interface RevealCardCommand {
  gameId: string;
  roomCode?: string;
  telegramId: number;
}

export interface GameCommandResult {
  game: GameDocument;
  room: RoomDocument;
}

export class GameCommandError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "GameCommandError";
  }
}

export async function submitHint(
  command: SubmitHintCommand,
): Promise<GameCommandResult> {
  const game = await gameRepository.findById(command.gameId);
  if (!game) {
    throw new GameCommandError("Game not found.", 404);
  }

  const room = await RoomModel.findById(game.roomId).exec();
  if (!room) {
    throw new GameCommandError("Room not found.", 404);
  }

  if (
    command.roomCode &&
    room.roomCode !== command.roomCode.trim().toUpperCase()
  ) {
    throw new GameCommandError("Game does not belong to this room.");
  }

  const result = applyHintSubmission({
    game: {
      status: game.status,
      currentTurn: game.currentTurn,
      remainingGuesses: game.remainingGuesses,
      currentHintWord: game.currentHintWord ?? null,
      currentHintNumber: game.currentHintNumber ?? null,
      hintSubmittedAt: game.hintSubmittedAt ?? null,
      hintHistory: game.hintHistory ?? [],
    },
    room: { players: room.players },
    senderTelegramId: command.telegramId,
    word: command.word,
    number: command.number,
  });

  const hint = result.game.hintHistory[result.game.hintHistory.length - 1];
  if (!hint) {
    throw new GameCommandError("Unable to submit hint.");
  }

  const roundHint = {
    ...hint,
    playerId:
      room.players.find((player) => player.telegramId === command.telegramId)
        ?.userId ?? null,
  };

  const updatedGame = await gameRepository.update(
    command.gameId,
    {
      currentHintWord: result.game.currentHintWord,
      currentHintNumber: result.game.currentHintNumber,
      remainingGuesses: result.game.remainingGuesses,
      hintSubmittedAt: result.game.hintSubmittedAt,
      hintHistory: result.game.hintHistory,
      rounds: [
        ...(game.rounds ?? []),
        {
          id: `round-${hint.submittedAt.toISOString()}`,
          team: hint.team,
          hint: roundHint,
          guesses: [],
        },
      ],
      phase: "operatives",
      phaseStartedAt: result.game.hintSubmittedAt,
    },
    game.updatedAt,
  );

  if (!updatedGame) {
    throw new GameCommandError("Unable to update game hint.", 500);
  }

  return { game: updatedGame, room };
}

export async function selectCard(
  command: SelectCardCommand,
): Promise<GameCommandResult> {
  const game = await gameRepository.findById(command.gameId);
  if (!game) {
    throw new GameCommandError("Game not found.", 404);
  }

  const room = await RoomModel.findById(game.roomId).exec();
  if (!room) {
    throw new GameCommandError("Room not found.", 404);
  }

  if (
    command.roomCode &&
    room.roomCode !== command.roomCode.trim().toUpperCase()
  ) {
    throw new GameCommandError("Game does not belong to this room.");
  }

  const result = applyCardSelection({
    game: {
      status: game.status,
      currentTurn: game.currentTurn,
      remainingGuesses: game.remainingGuesses,
      currentHintWord: game.currentHintWord ?? null,
      currentHintNumber: game.currentHintNumber ?? null,
      hintSubmittedAt: game.hintSubmittedAt ?? null,
      board: game.board,
      selectedCardId: game.selectedCardId ?? null,
      selectedByPlayerId: game.selectedByPlayerId ?? null,
      selectedAt: game.selectedAt ?? null,
    },
    room: { players: room.players },
    senderTelegramId: command.telegramId,
    cardId: command.cardId,
  });

  const updatedGame = await gameRepository.update(
    command.gameId,
    {
      selectedCardId: result.game.selectedCardId,
      selectedByPlayerId: result.game.selectedByPlayerId,
      selectedAt: result.game.selectedAt,
    },
    game.updatedAt,
  );

  if (!updatedGame) {
    throw new GameCommandError("Unable to update selection.", 500);
  }

  return { game: updatedGame, room };
}

export async function passTurn(
  command: PassTurnCommand,
): Promise<GameCommandResult> {
  const game = await gameRepository.findById(command.gameId);
  if (!game) throw new GameCommandError("Game not found.", 404);

  const room = await RoomModel.findById(game.roomId).exec();
  if (!room) throw new GameCommandError("Room not found.", 404);

  if (
    command.roomCode &&
    room.roomCode !== command.roomCode.trim().toUpperCase()
  ) {
    throw new GameCommandError("Game does not belong to this room.");
  }

  const result = applyTurnPass({
    game: {
      status: game.status,
      currentTurn: game.currentTurn,
      remainingGuesses: game.remainingGuesses,
      currentHintWord: game.currentHintWord ?? null,
      currentHintNumber: game.currentHintNumber ?? null,
      hintSubmittedAt: game.hintSubmittedAt ?? null,
      board: game.board,
      selectedCardId: game.selectedCardId ?? null,
      selectedByPlayerId: game.selectedByPlayerId ?? null,
      selectedAt: game.selectedAt ?? null,
    },
    room: { players: room.players },
    senderTelegramId: command.telegramId,
  });

  const updatedGame = await gameRepository.update(
    command.gameId,
    {
      currentTurn: result.game.currentTurn,
      remainingGuesses: result.game.remainingGuesses,
      currentHintWord: result.game.currentHintWord,
      currentHintNumber: result.game.currentHintNumber,
      hintSubmittedAt: result.game.hintSubmittedAt,
      selectedCardId: result.game.selectedCardId,
      selectedByPlayerId: result.game.selectedByPlayerId,
      selectedAt: result.game.selectedAt,
      rounds: (game.rounds ?? []).map((round, index, rounds) =>
        index === rounds.length - 1
          ? {
              ...round,
              passes: [
                ...(round.passes ?? []),
                {
                  playerId:
                    room.players.find(
                      (player) => player.telegramId === command.telegramId,
                    )?.userId ?? null,
                  passedAt: new Date(),
                },
              ],
            }
          : round,
      ),
      phase: "spymaster",
      phaseStartedAt: new Date(),
      turnStartedAt: new Date(),
    },
    game.updatedAt,
  );

  if (!updatedGame) {
    throw new GameCommandError("Unable to pass turn.", 500);
  }

  return { game: updatedGame, room };
}

export async function revealCard(
  command: RevealCardCommand,
): Promise<GameCommandResult> {
  const game = await gameRepository.findById(command.gameId);
  if (!game) throw new GameCommandError("Game not found.", 404);

  const room = await RoomModel.findById(game.roomId).exec();
  if (!room) throw new GameCommandError("Room not found.", 404);

  if (
    command.roomCode &&
    room.roomCode !== command.roomCode.trim().toUpperCase()
  ) {
    throw new GameCommandError("Game does not belong to this room.");
  }

  const revealResult = applyCardReveal({
    game: {
      status: game.status,
      currentTurn: game.currentTurn,
      remainingGuesses: game.remainingGuesses,
      currentHintWord: game.currentHintWord ?? null,
      currentHintNumber: game.currentHintNumber ?? null,
      hintSubmittedAt: game.hintSubmittedAt ?? null,
      board: game.board,
      selectedCardId: game.selectedCardId ?? null,
      selectedByPlayerId: game.selectedByPlayerId ?? null,
      selectedAt: game.selectedAt ?? null,
    },
    room: { players: room.players },
    senderTelegramId: command.telegramId,
  });

  const completionResult = applyGameCompletion({
    game: {
      ...revealResult.game,
      startingTeam: game.startingTeam,
      winningTeam: game.winningTeam ?? null,
      completionReason: game.completionReason ?? null,
      completedAt: game.completedAt ?? null,
    },
  });

  const revealedIndex = Number.parseInt(game.selectedCardId ?? "", 10);
  const revealedCard = game.board[revealedIndex];
  const selectedCardColor = revealedCard?.color ?? null;
  const resolvedGame = completionResult.completed
    ? completionResult.game
    : applyTurnOutcome({
        game: revealResult.game,
        room: { players: room.players },
        senderTelegramId: command.telegramId,
        revealedCardColor: selectedCardColor,
      }).game;

  const rounds = [...(game.rounds ?? [])];
  let currentRound = rounds[rounds.length - 1];
  if (
    !currentRound &&
    game.currentHintWord !== null &&
    game.currentHintNumber !== null
  ) {
    currentRound = {
      id: `round-${game.hintSubmittedAt?.toISOString() ?? Date.now()}`,
      team: game.currentTurn,
      hint: {
        word: game.currentHintWord,
        number: game.currentHintNumber,
        team: game.currentTurn,
        submittedAt: game.hintSubmittedAt ?? new Date(),
        playerId: null,
      },
      guesses: [],
    };
    rounds.push(currentRound);
  }

  if (currentRound && revealedCard) {
    rounds[rounds.length - 1] = {
      ...currentRound,
      guesses: [
        ...currentRound.guesses,
        {
          word: revealedCard.word,
          cardIndex: revealedIndex,
          playerId: game.selectedByPlayerId ?? null,
          correct: revealedCard.color === game.currentTurn,
          revealedAt: new Date(),
        },
      ],
    };
  }

  const updatedGame = await gameRepository.update(
    command.gameId,
    {
      board: revealResult.game.board,
      ...getRemainingCardCounts(revealResult.game.board),
      status: resolvedGame.status,
      currentTurn: resolvedGame.currentTurn,
      remainingGuesses: resolvedGame.remainingGuesses,
      currentHintWord: resolvedGame.currentHintWord,
      currentHintNumber: resolvedGame.currentHintNumber,
      hintSubmittedAt: resolvedGame.hintSubmittedAt,
      selectedCardId: resolvedGame.selectedCardId,
      selectedByPlayerId: resolvedGame.selectedByPlayerId,
      selectedAt: resolvedGame.selectedAt,
      winningTeam: completionResult.completed
        ? completionResult.game.winningTeam
        : (game.winningTeam ?? null),
      completionReason: completionResult.completed
        ? completionResult.game.completionReason
        : (game.completionReason ?? null),
      completedAt: completionResult.completed
        ? completionResult.game.completedAt
        : (game.completedAt ?? null),
      rounds,
      ...(resolvedGame.currentTurn !== game.currentTurn
        ? {
            phase: "spymaster",
            phaseStartedAt: new Date(),
            turnStartedAt: new Date(),
          }
        : {}),
    },
    game.updatedAt,
  );

  if (!updatedGame) throw new GameCommandError("Unable to reveal card.", 500);
  return { game: updatedGame, room };
}
