import type { Socket } from "socket.io-client";
import type { GameView } from "@/../shared/src/types/game";
import type {
  GameHintPayload,
  GamePassPayload,
  GameSelectPayload,
} from "@/../shared/src/types/socket";

interface UseGameActionsInput {
  socket: Socket | null;
  roomCode: string;
  telegramId?: number;
  game: GameView | null;
  canSubmitHint: boolean;
  canSelectCard: boolean;
  canPassTurn: boolean;
  canTakeTurn: boolean;
  secondsRemaining: number | null;
  hintSubmitting: boolean;
  setHintSubmitting: (value: boolean) => void;
  setHintMessage: (message: string | null) => void;
  setHintDraft: (draft: { word: string; number: string }) => void;
  setSelectedHintCardIds: (ids: Set<number>) => void;
}

export function useGameActions({
  socket,
  roomCode,
  telegramId,
  game,
  canSubmitHint,
  canSelectCard,
  canPassTurn,
  canTakeTurn,
  secondsRemaining,
  hintSubmitting,
  setHintSubmitting,
  setHintMessage,
  setHintDraft,
  setSelectedHintCardIds,
}: UseGameActionsInput) {
  function emitError(): void {
    setHintMessage("Socket connection is unavailable.");
  }

  function submitHint(word: string, numberText: string): void {
    if (!game || telegramId === undefined || hintSubmitting) return;

    const number = Number(numberText);
    if (!canSubmitHint || !Number.isInteger(number) || number <= 0) {
      setHintMessage("Hint number must be a positive integer.");
      return;
    }
    if (!socket) {
      emitError();
      return;
    }

    setHintSubmitting(true);
    setHintMessage(null);
    const payload: GameHintPayload = {
      gameId: game.id ?? game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId,
      word: word.trim(),
      number,
    };
    socket.emit("game:hint", payload);
    setHintDraft({ word: "", number: "" });
    setSelectedHintCardIds(new Set());
    setHintMessage("Hint submitted.");
    setHintSubmitting(false);
  }

  function selectCard(cardIndex: number): void {
    if (!game || telegramId === undefined || !canSelectCard || hintSubmitting) {
      return;
    }
    if (!socket) {
      emitError();
      return;
    }

    const payload: GameSelectPayload = {
      gameId: game.id ?? game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId,
      cardId: String(cardIndex),
      confirm: false,
    };
    socket.emit("game:select", payload);
  }

  function confirmSelection(): void {
    if (!game || telegramId === undefined || game.selectedCardId === null) {
      return;
    }
    if (!socket) {
      emitError();
      return;
    }

    const payload: GameSelectPayload = {
      gameId: game.id ?? game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId,
      cardId: game.selectedCardId,
      confirm: true,
    };
    socket.emit("game:select", payload);
  }

  function passTurn(): void {
    if (!game || telegramId === undefined || !canPassTurn || hintSubmitting) {
      return;
    }
    if (!socket) {
      emitError();
      return;
    }

    const payload: GamePassPayload = {
      gameId: game.id ?? game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId,
      timeout: secondsRemaining === 0,
    };
    socket.emit("game:pass", payload);
  }

  function takeTurn(): void {
    if (!game || telegramId === undefined || !canTakeTurn) return;
    if (!socket) {
      emitError();
      return;
    }

    const payload: GamePassPayload = {
      gameId: game.id ?? game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId,
      timeout: true,
    };
    socket.emit("game:pass", payload);
  }

  return {
    submitHint,
    selectCard,
    confirmSelection,
    passTurn,
    takeTurn,
  };
}
