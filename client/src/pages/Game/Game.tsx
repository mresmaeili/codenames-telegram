import { useEffect, useMemo, useState } from "react";

import { BoardGrid } from "@/components/BoardGrid";
import { GameHeader } from "@/components/GameHeader";
import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { getSocketClient } from "@/socket/client";
import type { GameView } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";

interface GamePageProps {
  roomCode: string;
  onLeave: () => void;
}

interface GamePageState {
  room: Room | null;
  game: GameView | null;
  loading: boolean;
  error: string | null;
}

function getPlayerCount(room: Room | null): number {
  return room?.players.length ?? 0;
}

export function GamePage({ roomCode, onLeave }: GamePageProps) {
  const { user } = useAuthContext();
  const [state, setState] = useState<GamePageState>({
    room: null,
    game: null,
    loading: true,
    error: null,
  });
  const [hintDraft, setHintDraft] = useState({ word: "", number: "" });
  const [hintSubmitting, setHintSubmitting] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socket = useMemo(() => getSocketClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadGameData() {
      try {
        const roomResponse = await fetch(`/api/rooms/${roomCode}`);
        if (!roomResponse.ok) {
          throw new Error("Unable to load the game board.");
        }

        const room = (await roomResponse.json()) as Room;
        const viewerTelegramId = user?.telegramId;
        const viewerRole =
          viewerTelegramId !== undefined
            ? (room.players.find(
                (player) => player.telegramId === viewerTelegramId,
              )?.role ?? "operative")
            : "operative";
        const gameUrl = `/api/games/${roomCode}${viewerTelegramId === undefined ? "" : `?telegramId=${viewerTelegramId}`}`;
        const gameResponse = await fetch(gameUrl);

        if (!gameResponse.ok) {
          throw new Error("Unable to load the game board.");
        }

        const game = (await gameResponse.json()) as GameView;

        if (isMounted) {
          setState({ room, game, loading: false, error: null });
          setIsReconnecting(false);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the game board.";
        if (isMounted) {
          setState({ room: null, game: null, loading: false, error: message });
        }
      }
    }

    void loadGameData();

    if (socket) {
      const handleRoomUpdated = (room: Room) => {
        if (isMounted) {
          setState((current) => ({ ...current, room, error: null }));
        }
      };

      const handleGameInitialized = () => {
        if (isMounted) {
          setIsReconnecting(true);
          void loadGameData();
        }
      };

      const handleHinted = (payload: {
        gameId: string;
        currentHintWord: string | null;
        currentHintNumber: number | null;
        remainingGuesses: number;
        hintSubmittedAt: string | null;
      }) => {
        if (isMounted) {
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  currentHintWord: payload.currentHintWord,
                  currentHintNumber: payload.currentHintNumber,
                  remainingGuesses: payload.remainingGuesses,
                  hintSubmittedAt: payload.hintSubmittedAt
                    ? new Date(payload.hintSubmittedAt)
                    : null,
                }
              : current.game,
            error: null,
          }));
        }
      };

      const handleSelected = (payload: {
        gameId: string;
        selectedCardId: string | null;
        selectedByPlayerId: string | null;
        selectedAt: string | null;
      }) => {
        if (isMounted) {
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  selectedCardId: payload.selectedCardId,
                  selectedByPlayerId: payload.selectedByPlayerId,
                  selectedAt: payload.selectedAt
                    ? new Date(payload.selectedAt)
                    : null,
                }
              : current.game,
            error: null,
          }));
        }
      };

      const handleRevealed = (payload: {
        gameId: string;
        board: GameView["board"];
        currentTurn: string;
        remainingGuesses: number;
        currentHintWord: string | null;
        currentHintNumber: number | null;
        status: string;
        selectedCardId: string | null;
        selectedByPlayerId: string | null;
        selectedAt: string | null;
        winningTeam: GameView["winningTeam"];
        completionReason: GameView["completionReason"];
        completedAt: string | null;
      }) => {
        if (isMounted) {
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  board: payload.board,
                  currentTurn: payload.currentTurn as GameView["currentTurn"],
                  remainingGuesses: payload.remainingGuesses,
                  currentHintWord: payload.currentHintWord,
                  currentHintNumber: payload.currentHintNumber,
                  status: payload.status as GameView["status"],
                  selectedCardId: payload.selectedCardId,
                  selectedByPlayerId: payload.selectedByPlayerId,
                  selectedAt: payload.selectedAt
                    ? new Date(payload.selectedAt)
                    : null,
                  winningTeam: payload.winningTeam,
                  completionReason: payload.completionReason,
                  completedAt: payload.completedAt
                    ? new Date(payload.completedAt)
                    : null,
                }
              : current.game,
            error: null,
          }));
        }
      };

      const handleReconnect = () => {
        if (isMounted) {
          setIsReconnecting(true);
          setHintMessage("Reconnected. Syncing the latest board state...");
          void loadGameData();
        }
      };

      const handlePassed = (payload: {
        gameId: string;
        currentTurn: string;
        remainingGuesses: number;
        currentHintWord: string | null;
        currentHintNumber: number | null;
        selectedCardId: string | null;
        selectedByPlayerId: string | null;
        selectedAt: string | null;
      }) => {
        if (isMounted) {
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  currentTurn: payload.currentTurn as GameView["currentTurn"],
                  remainingGuesses: payload.remainingGuesses,
                  currentHintWord: payload.currentHintWord,
                  currentHintNumber: payload.currentHintNumber,
                  selectedCardId: payload.selectedCardId,
                  selectedByPlayerId: payload.selectedByPlayerId,
                  selectedAt: payload.selectedAt
                    ? new Date(payload.selectedAt)
                    : null,
                }
              : current.game,
            error: null,
          }));
        }
      };

      socket.on("connect", handleReconnect);
      socket.on("room:updated", handleRoomUpdated);
      socket.on("game:initialized", handleGameInitialized);
      socket.on("game:hinted", handleHinted);
      socket.on("game:selected", handleSelected);
      socket.on("game:revealed", handleRevealed);
      socket.on("game:passed", handlePassed);

      return () => {
        isMounted = false;
        socket.off("connect", handleReconnect);
        socket.off("room:updated", handleRoomUpdated);
        socket.off("game:initialized", handleGameInitialized);
        socket.off("game:hinted", handleHinted);
        socket.off("game:selected", handleSelected);
        socket.off("game:revealed", handleRevealed);
        socket.off("game:passed", handlePassed);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [roomCode, socket, user?.telegramId]);

  const viewerPlayer = state.room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );
  const isActiveSpymaster =
    Boolean(viewerPlayer) &&
    viewerPlayer?.team === state.game?.currentTurn &&
    viewerPlayer?.role === "spymaster" &&
    state.game?.status === "active";
  const isActiveOperative =
    Boolean(viewerPlayer) &&
    viewerPlayer?.team === state.game?.currentTurn &&
    viewerPlayer?.role === "operative" &&
    state.game?.status === "active";
  const hasActiveHint = Boolean(
    state.game?.currentHintWord || state.game?.currentHintNumber !== null,
  );
  const canSubmitHint = isActiveSpymaster && !hasActiveHint;
  const canSelectCard =
    isActiveOperative &&
    Boolean(
      state.game?.currentHintWord && state.game?.currentHintNumber !== null,
    ) &&
    state.game?.selectedCardId === null;
  const canConfirmSelection =
    isActiveOperative && Boolean(state.game?.selectedCardId);
  const canPassTurn = isActiveOperative && state.game?.status === "active";
  const gameFinished = state.game?.status === "finished";
  const completionSummary = gameFinished
    ? state.game?.completionReason === "assassin-revealed"
      ? `${state.game.winningTeam ?? "The opposing team"} wins after the assassin was revealed.`
      : state.game?.winningTeam
        ? `${state.game.winningTeam} team wins after revealing all of their cards.`
        : "The game has finished."
    : null;

  async function handleSubmitHint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.game || !user?.telegramId || hintSubmitting) {
      return;
    }

    const parsedNumber = Number(hintDraft.number);
    if (!canSubmitHint || Number.isNaN(parsedNumber) || parsedNumber <= 0) {
      setHintMessage("Hint number must be a positive integer.");
      return;
    }

    setHintSubmitting(true);
    setHintMessage(null);

    try {
      if (!socket) {
        throw new Error("Socket connection is unavailable.");
      }

      socket.emit("game:hint", {
        gameId: state.game.id ?? state.game.roomId,
        roomCode: roomCode.toUpperCase(),
        telegramId: user.telegramId,
        word: hintDraft.word.trim(),
        number: parsedNumber,
      });

      setHintDraft({ word: "", number: "" });
      setHintMessage("Hint submitted.");
    } catch (error) {
      setHintMessage(
        error instanceof Error ? error.message : "Unable to submit hint.",
      );
    } finally {
      setHintSubmitting(false);
    }
  }

  function handleSelectCard(cardIndex: number) {
    if (
      !state.game ||
      !user?.telegramId ||
      !canSelectCard ||
      state.game.selectedCardId !== null ||
      hintSubmitting
    ) {
      return;
    }

    if (!socket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    socket.emit("game:select", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
      cardId: String(cardIndex),
    });
  }

  function handleRevealCard() {
    if (
      !state.game ||
      !user?.telegramId ||
      !canConfirmSelection ||
      hintSubmitting
    ) {
      return;
    }

    if (!socket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    socket.emit("game:reveal", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
    });
  }

  function handlePassTurn() {
    if (!state.game || !user?.telegramId || !canPassTurn || hintSubmitting) {
      return;
    }

    if (!socket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    socket.emit("game:pass", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
    });
  }

  if (state.loading) {
    return (
      <PageContainer>
        <StatusPanel
          title="Loading game"
          description="We are restoring the latest room and board state now."
          tone="info"
        />
      </PageContainer>
    );
  }

  if (state.error || !state.room || !state.game) {
    return (
      <PageContainer>
        <div className="space-y-4 rounded-3xl border border-(--app-border) bg-(--app-surface) p-6">
          <StatusPanel
            title="Board unavailable"
            description={
              state.error ??
              "We could not restore the game state. Please try again in a moment."
            }
            tone="error"
          />
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border border-(--app-border) px-4 py-2 text-sm font-medium text-(--app-text)"
          >
            Return to lobby
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full max-w-6xl space-y-4">
        {isReconnecting ? (
          <StatusPanel
            title="Reconnecting"
            description="Your connection dropped. We are syncing the latest room and board state."
            tone="info"
          />
        ) : null}

        <GameHeader
          room={state.room}
          game={state.game}
          playerCount={getPlayerCount(state.room)}
        />

        <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-3 shadow-sm sm:p-4">
          {gameFinished ? (
            <div className="mb-3 rounded-2xl border border-(--app-accent)/40 bg-(--app-accent)/10 p-3 text-sm text-(--app-text)">
              <p className="font-semibold text-(--app-accent)">Game finished</p>
              <p className="mt-1">{completionSummary}</p>
            </div>
          ) : null}
          {hintMessage ? (
            <div className="mb-3">
              <StatusPanel
                title="Board update"
                description={hintMessage}
                tone="info"
              />
            </div>
          ) : null}
          <BoardGrid
            cards={state.game.board}
            role={state.game.role}
            selectedCardId={state.game.selectedCardId}
            canSelectCard={canSelectCard}
            onSelectCard={handleSelectCard}
          />
          {canConfirmSelection ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleRevealCard}
                className="rounded-full border border-(--app-border) bg-(--app-accent) px-3 py-2 text-sm font-medium text-white"
              >
                Confirm selection
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4 text-sm text-(--app-muted)">
          <div className="flex flex-col gap-3 rounded-2xl border border-(--app-border) bg-(--app-background)/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--app-muted)">
                Hint panel
              </p>
              <p className="mt-1 text-sm text-(--app-text)">
                Current hint: {state.game.currentHintWord ?? "—"}
              </p>
              <p className="text-sm text-(--app-muted)">
                Remaining guesses: {state.game.remainingGuesses}
              </p>
            </div>
            <form
              className="flex flex-col gap-2 sm:min-w-65"
              onSubmit={handleSubmitHint}
            >
              <input
                value={hintDraft.word}
                onChange={(event) =>
                  setHintDraft((current) => ({
                    ...current,
                    word: event.target.value,
                  }))
                }
                placeholder="Hint word"
                className="rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) outline-none"
                disabled={!canSubmitHint || hintSubmitting}
              />
              <input
                value={hintDraft.number}
                onChange={(event) =>
                  setHintDraft((current) => ({
                    ...current,
                    number: event.target.value,
                  }))
                }
                placeholder="Number"
                inputMode="numeric"
                className="rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) outline-none"
                disabled={!canSubmitHint || hintSubmitting}
              />
              <button
                type="submit"
                className="rounded-full border border-(--app-border) bg-(--app-accent) px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmitHint || hintSubmitting}
              >
                {hintSubmitting ? "Submitting…" : "Submit hint"}
              </button>
            </form>
          </div>
          {hintMessage ? (
            <p className="mt-3 text-sm text-(--app-text)">{hintMessage}</p>
          ) : null}
          <p className="mt-3">
            {user?.firstName
              ? `${user.firstName}, this board is currently for display only.`
              : "This board is currently for display only."}
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
