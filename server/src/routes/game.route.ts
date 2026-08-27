import { Router } from "express";

import { RoomModel } from "../models/room.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { getGameByRoomCode } from "../services/game.service.js";
import { applyHintSubmission } from "../services/hint.service.js";
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
      room: {
        players: roomRecord.players,
      },
      senderTelegramId,
      word,
      number,
    });

    const updatedGame = await gameRepository.update(gameId, {
      currentHintWord: result.game.currentHintWord,
      currentHintNumber: result.game.currentHintNumber,
      remainingGuesses: result.game.remainingGuesses,
      hintSubmittedAt: result.game.hintSubmittedAt,
      hintHistory: result.game.hintHistory,
    });

    if (!updatedGame) {
      response.status(500).json({ message: "Unable to update game hint." });
      return;
    }

    response.status(200).json(updatedGame);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit hint.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/select", async (request, response) => {
  try {
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
    const cardId = request.body?.cardId;

    if (typeof senderTelegramId !== "number" || typeof cardId !== "string") {
      response.status(400).json({ message: "Invalid selection payload." });
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
      room: {
        players: roomRecord.players,
      },
      senderTelegramId,
      cardId,
    });

    const updatedGame = await gameRepository.update(gameId, {
      selectedCardId: result.game.selectedCardId,
      selectedByPlayerId: result.game.selectedByPlayerId,
      selectedAt: result.game.selectedAt,
    });

    if (!updatedGame) {
      response.status(500).json({ message: "Unable to update selection." });
      return;
    }

    response.status(200).json(updatedGame);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to select card.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/reveal", async (request, response) => {
  try {
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

    const updatedGame = await gameRepository.update(gameId, {
      board: revealResult.game.board,
      redCardsRemaining: revealResult.game.board.filter(
        (card) => card.color === "red" && !card.revealed,
      ).length,
      blueCardsRemaining: revealResult.game.board.filter(
        (card) => card.color === "blue" && !card.revealed,
      ).length,
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
      ...(resolvedGame.currentTurn !== game.currentTurn
        ? { turnStartedAt: new Date() }
        : {}),
    });

    if (!updatedGame) {
      response.status(500).json({ message: "Unable to reveal card." });
      return;
    }

    response.status(200).json(updatedGame);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reveal card.";
    response.status(400).json({ message });
  }
});

gameRouter.post("/:gameId/pass", async (request, response) => {
  try {
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
      response.status(400).json({ message: "Invalid pass payload." });
      return;
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
      room: {
        players: roomRecord.players,
      },
      senderTelegramId,
    });

    const updatedGame = await gameRepository.update(gameId, {
      currentTurn: result.game.currentTurn,
      remainingGuesses: result.game.remainingGuesses,
      currentHintWord: result.game.currentHintWord,
      currentHintNumber: result.game.currentHintNumber,
      hintSubmittedAt: result.game.hintSubmittedAt,
      selectedCardId: result.game.selectedCardId,
      selectedByPlayerId: result.game.selectedByPlayerId,
      selectedAt: result.game.selectedAt,
      turnStartedAt: new Date(),
    });

    if (!updatedGame) {
      response.status(500).json({ message: "Unable to pass turn." });
      return;
    }

    response.status(200).json(updatedGame);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to pass turn.";
    response.status(400).json({ message });
  }
});
