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
  onGameUpdated?: () => void | Promise<void>;
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
  onGameUpdated,
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
    socket.emit("game:hint", payload, (error?: { message?: string }) => {
      setHintSubmitting(false);
      if (error?.message) {
        setHintMessage(error.message);
        return;
      }
      setHintMessage("Hint submitted.");
    });
    setHintDraft({ word: "", number: "" });
    setSelectedHintCardIds(new Set());
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
    socket.emit("game:select", payload, (error?: { message?: string }) => {
      if (!error?.message) return;
      setHintMessage(error.message);
      void onGameUpdated?.();
    });
  }

  function confirmSelection(cardId?: string): void {
    const selectedCardId = cardId ?? game?.selectedCardId;
    if (!game || telegramId === undefined || selectedCardId === null) {
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
      cardId: selectedCardId,
      confirm: true,
    };
    socket.emit("game:select", payload, (error?: { message?: string }) => {
      if (error?.message) {
        setHintMessage(error.message);
        return;
      }

      void onGameUpdated?.();
    });
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
      timeout: secondsRemaining !== null && secondsRemaining <= 0,
    };
    socket.emit("game:pass", payload, (error?: { message?: string }) => {
      if (error?.message) setHintMessage(error.message);
    });
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
    socket.emit("game:pass", payload, (error?: { message?: string }) => {
      if (error?.message) setHintMessage(error.message);
    });
  }

  return {
    submitHint,
    selectCard,
    confirmSelection,
    passTurn,
    takeTurn,
  };
}
