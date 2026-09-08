import { Router } from "express";

import { gameRepository } from "../repositories/game.repository.js";
import { RoomModel } from "../models/room.model.js";
import {
  getGameByRoomCode,
  getRemainingCardCounts,
} from "../services/game.service.js";
import {
  GameCommandError,
  passTurn,
  revealCard,
  selectCard,
  submitHint,
} from "../services/game-command.service.js";
import { applyCardSelection } from "../services/selection.service.js";
import { applyCardReveal } from "../services/reveal.service.js";
import { applyTurnOutcome, applyTurnPass } from "../services/turn.service.js";
import {
  applyGameCompletion,
  validateGameplayAction,
} from "../services/win-condition.service.js";

export const gameRouter = Router();

gameRouter.get("/:roomCode", async (request, response, next) => {
  try {
    const telegramIdParam = request.query.telegramId;
    const viewerTelegramId =
      typeof telegramIdParam === "string" && telegramIdParam.trim()
        ? Number(telegramIdParam)
        : undefined;
    const game = await getGameByRoomCode(
      request.params.roomCode,
      Number.isFinite(viewerTelegramId) ? viewerTelegramId : undefined,
    );

    if (!game) {
      response.status(404).json({ message: "Game not found." });
      return;
    }

    response.status(200).json(game);
  } catch (error) {
    next(error);
  }
});

gameRouter.post("/:gameId/hint", async (request, response) => {
  try {
    const senderTelegramId = request.body?.telegramId;
    const word = request.body?.word;
    const number = request.body?.number;

    if (
      typeof senderTelegramId !== "number" ||
      typeof word !== "string" ||
      typeof number !== "number"
    ) {
      response.status(400).json({ message: "Invalid hint payload." });
      return;
    }

    const result = await submitHint({
      gameId: request.params.gameId,
      telegramId: senderTelegramId,
      word,
      number,
    });

    response.status(200).json(result.game);
  } catch (error) {
    if (error instanceof GameCommandError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to submit hint.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/select", async (request, response) => {
  try {
    const senderTelegramId = request.body?.telegramId;
    const cardId = request.body?.cardId;

    if (typeof senderTelegramId !== "number" || typeof cardId !== "string") {
      response.status(400).json({ message: "Invalid selection payload." });
      return;
    }

    const result = await selectCard({
      gameId: request.params.gameId,
      telegramId: senderTelegramId,
      cardId,
    });

    response.status(200).json(result.game);
  } catch (error) {
    if (error instanceof GameCommandError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to select card.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/reveal", async (request, response) => {
  try {
    const senderTelegramId = request.body?.telegramId;

    if (typeof senderTelegramId !== "number") {
      response.status(400).json({ message: "Invalid reveal payload." });
      return;
    }

    const result = await revealCard({
      gameId: request.params.gameId,
      telegramId: senderTelegramId,
    });

    response.status(200).json(result.game);
    return;

    /* legacy inline reveal path retained temporarily during cleanup
    const gameId = request.params.gameId;
    const game = await gameRepository.findById(gameId);

    if (!game) {
      response.status(404).json({ message: "Game not found." });
      return;
    }

    const roomRecord = await RoomModel.findById(game.roomId).exec();

    if (!roomRecord) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    const senderTelegramId = request.body?.telegramId;

    if (typeof senderTelegramId !== "number") {
      response.status(400).json({ message: "Invalid reveal payload." });
      return;
    }

    const validation = validateGameplayAction({
      game: {
        status: game.status,
        currentTurn: game.currentTurn,
        startingTeam: game.startingTeam,
        remainingGuesses: game.remainingGuesses,
        currentHintWord: game.currentHintWord ?? null,
        currentHintNumber: game.currentHintNumber ?? null,
        hintSubmittedAt: game.hintSubmittedAt ?? null,
        board: game.board,
        selectedCardId: game.selectedCardId ?? null,
        selectedByPlayerId: game.selectedByPlayerId ?? null,
        selectedAt: game.selectedAt ?? null,
        winningTeam: game.winningTeam ?? null,
        completionReason: game.completionReason ?? null,
        completedAt: game.completedAt ?? null,
      },
    });

    if (!validation.ok) {
      response.status(400).json({ message: validation.error });
      return;
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
      room: {
        players: roomRecord.players,
      },
      senderTelegramId,
    });

    const completionResult = applyGameCompletion({
      game: {
        ...revealResult.game,
        status: revealResult.game.status,
        startingTeam: game.startingTeam,
        winningTeam: game.winningTeam ?? null,
        completionReason: game.completionReason ?? null,
        completedAt: game.completedAt ?? null,
      },
    });

    const resolvedGame = completionResult.completed
      ? completionResult.game
      : applyTurnOutcome({
          game: revealResult.game,
          room: {
            players: roomRecord.players,
          },
          senderTelegramId,
          revealedCardColor:
            game.board[Number.parseInt(game.selectedCardId ?? "", 10)]?.color ??
            null,
        }).game;

    const revealedIndex = Number.parseInt(game.selectedCardId ?? "", 10);
    const revealedCard = game.board[revealedIndex];
    const rounds = [...(game.rounds ?? [])];
    const currentRound = rounds[rounds.length - 1];
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
      gameId,
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
          ? { phase: "spymaster", phaseStartedAt: new Date() }
          : {}),
        ...(resolvedGame.currentTurn !== game.currentTurn
          ? { turnStartedAt: new Date() }
          : {}),
      },
      game.updatedAt,
    );

    if (!updatedGame) {
      response.status(500).json({ message: "Unable to reveal card." });
      return;
    }

    response.status(200).json(updatedGame); */
  } catch (error) {
    if (error instanceof GameCommandError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to reveal card.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/pass", async (request, response) => {
  try {
    const senderTelegramId = request.body?.telegramId;

    if (typeof senderTelegramId !== "number") {
      response.status(400).json({ message: "Invalid pass payload." });
      return;
    }

    const result = await passTurn({
      gameId: request.params.gameId,
      telegramId: senderTelegramId,
    });

    response.status(200).json(result.game);
  } catch (error) {
    if (error instanceof GameCommandError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to pass turn.";
    response.status(400).json({ message });
  }
});
