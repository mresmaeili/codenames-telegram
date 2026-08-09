import { useEffect, useMemo, useState } from "react";

import { BoardGrid } from "@/components/BoardGrid";
import { GameHeader } from "@/components/GameHeader";
import { EndGameModal } from "@/components/EndGameModal";
import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getSocketClient } from "@/socket/client";
import { isDevModeEnabled } from "@/lib/dev";
import type { GameView, HintEntry, Turn } from "@/../shared/src/types/game";
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

  const [refreshingGame, setRefreshingGame] = useState(false);
  const devMode = isDevModeEnabled();
  const [showKeycard, setShowKeycard] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const toast = useToast();
  const [hideBoard, setHideBoard] = useState(() => {
    try {
      const raw = localStorage.getItem("codenames.hideBoard");
      return raw === "true";
    } catch (error) {
      return false;
    }
  });

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

      setState({ room, game, loading: false, error: null });
      setIsReconnecting(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load the game board.";
      setState({ room: null, game: null, loading: false, error: message });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!isMounted) {
        return;
      }
      await loadGameData();
    }

    void initialize();

    function joinRoomSocket() {
      if (!socket || !user?.telegramId || hasJoinedRoom) {
        return;
      }

      socket.emit("room:join", {
        roomCode: roomCode.toUpperCase(),
        telegramId: user.telegramId,
        displayName: user.firstName,
      });
      setHasJoinedRoom(true);
    }

    if (socket && socket.connected) {
      joinRoomSocket();
    }

    function handleConnect() {
      joinRoomSocket();
    }

    function handleDisconnect() {
      setHasJoinedRoom(false);
      if (isMounted) {
        setIsReconnecting(true);
        toast.error("Disconnected. Reconnecting...");
      }
    }

    if (socket) {
      const handleRoomUpdated = (room: Room) => {
        if (isMounted) {
          setState((current) => ({ ...current, room, error: null }));
        }
      };

      const handleGameInitialized = () => {
        if (isMounted) {
          setIsReconnecting(true);
          toast.success("Game starting. Loading board...");
          void loadGameData();
        }
      };

      const handleGameReset = () => {
        if (isMounted) {
          setHintMessage("Room reset detected. Reloading state...");
          void loadGameData();
        }
      };

      const handleKeycardReveal = (payload: {
        gameId: string;
        board: GameView["board"];
      }) => {
        if (isMounted) {
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  board: payload.board,
                }
              : current.game,
            error: null,
          }));
        }
      };

      const handleHinted = (payload: {
        gameId: string;
        currentHintWord: string | null;
        currentHintNumber: number | null;
        remainingGuesses: number;
        hintSubmittedAt: string | null;
        hintHistory: Array<{
          word: string;
          number: number;
          team: Turn;
          submittedAt: string;
        }>;
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
                  hintHistory: payload.hintHistory.map((hint) => ({
                    ...hint,
                    submittedAt: new Date(hint.submittedAt),
                  })),
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

          if (payload.status === "finished") {
            toast.success(
              payload.completionReason === "assassin-revealed"
                ? "Game over — the assassin was revealed."
                : `${payload.winningTeam ?? "The opposing team"} wins!`,
            );
          }
        }
      };

      const handleReconnect = () => {
        if (isMounted) {
          setIsReconnecting(true);
          setHintMessage("Reconnected. Syncing the latest board state...");
          toast.info("Reconnected. Restoring your game session...");
          if (user?.telegramId) {
            socket.emit("room:join", {
              roomCode: roomCode.toUpperCase(),
              telegramId: user.telegramId,
              displayName: user.firstName,
            });
            setHasJoinedRoom(true);
          }
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

      const handleGameError = (payload: { message?: string }) => {
        if (isMounted) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : "Unable to submit the hint.";
          setHintMessage(message);
          toast.error(message);
        }
      };

      const handleDisconnect = (reason: string) => {
        if (isMounted) {
          setIsReconnecting(true);
          toast.error(
            `Disconnected from the server. Attempting to reconnect... (${reason})`,
          );
        }
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("room:updated", handleRoomUpdated);
      socket.on("room:reset", handleGameReset);
      socket.on("game:initialized", handleGameInitialized);
      socket.on("game:keycard", handleKeycardReveal);
      socket.on("game:hinted", handleHinted);
      socket.on("game:revealed", handleRevealed);
      socket.on("game:passed", handlePassed);
      socket.on("game:error", handleGameError);

      return () => {
        isMounted = false;
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("room:updated", handleRoomUpdated);
        socket.off("room:reset", handleGameReset);
        socket.off("game:initialized", handleGameInitialized);
        socket.off("game:keycard", handleKeycardReveal);
        socket.off("game:hinted", handleHinted);
        socket.off("game:revealed", handleRevealed);
        socket.off("game:passed", handlePassed);
        socket.off("game:error", handleGameError);
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
    state.game?.selectedCardId === null &&
    state.game?.remainingGuesses > 0;
  const canPassTurn = isActiveOperative && state.game?.status === "active";
  const gameFinished = state.game?.status === "finished";
  const completionSummary = gameFinished
    ? state.game?.completionReason === "assassin-revealed"
      ? `${state.game.winningTeam ?? "The opposing team"} wins after the assassin was revealed.`
      : state.game?.winningTeam
        ? `${state.game.winningTeam} team wins after revealing all of their cards.`
        : "The game has finished."
    : null;

  const isRoomOwner = Boolean(
    state.room &&
    state.room.players.some(
      (player) =>
        player.telegramId === user?.telegramId &&
        state.room?.ownerIds?.includes(player.userId),
    ),
  );

  const endGameSummary = gameFinished
    ? isRoomOwner
      ? "You can start a rematch now to keep the same room and players."
      : "Ask the room owner to start the rematch when you're ready."
    : null;

  const isViewerSpymaster = Boolean(
    state.room &&
    user?.telegramId !== undefined &&
    state.room.players.find((p) => p.telegramId === user?.telegramId)?.role ===
      "spymaster",
  );

  const isViewerOperative = Boolean(
    state.room &&
    user?.telegramId !== undefined &&
    state.room.players.find((p) => p.telegramId === user?.telegramId)?.role ===
      "operative",
  );

  function handleReturnToLobby() {
    onLeave();
  }

  function handleRematch() {
    if (!state.room || !user?.telegramId || !socket) {
      setHintMessage("Unable to request a rematch.");
      return;
    }

    socket.emit("room:rematch", {
      roomCode: state.room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    setHintMessage("Requesting rematch...");
    toast.success("Rematch requested.");
  }

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

  async function refreshGameState() {
    setRefreshingGame(true);
    await loadGameData();
    setRefreshingGame(false);
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
      <div className="mx-auto w-full max-w-7xl space-y-4 px-2 pb-8">
        {gameFinished ? (
          <EndGameModal
            title="Game complete"
            description={completionSummary ?? "The game has finished."}
            summary={endGameSummary ?? undefined}
            onReturnToLobby={handleReturnToLobby}
            onRematch={isRoomOwner ? handleRematch : undefined}
          />
        ) : null}
        {devMode ? (
          <div className="rounded-3xl border border-(--app-border) bg-(--app-background) p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                  Dev inspector
                </p>
                <p className="mt-1 text-sm text-(--app-muted)">
                  Manual game refresh and raw JSON state for debugging.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshGameState}
                disabled={refreshingGame}
                className="rounded-full border border-(--app-border) px-4 py-2 text-sm font-medium text-(--app-text) disabled:opacity-60"
              >
                {refreshingGame ? "Refreshing..." : "Refresh game state"}
              </button>
            </div>
            <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-(--app-border) bg-(--app-background) p-3 text-xs text-(--app-text)">
              {JSON.stringify({ room: state.room, game: state.game }, null, 2)}
            </pre>
          </div>
        ) : null}

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

        <div className="grid gap-4 xl:grid-cols-[minmax(38rem,1.4fr)_minmax(26rem,0.8fr)]">
          <section className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                  Game board
                </p>
                <h2 className="mt-2 text-xl font-semibold text-(--app-text)">
                  {state.game.currentTurn} team’s turn
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-(--app-border) px-3 py-2 text-xs text-(--app-muted)">
                  Start: {state.game.startingTeam}
                </span>
                <span className="rounded-full border border-(--app-border) px-3 py-2 text-xs text-(--app-muted)">
                  Guesses: {state.game.remainingGuesses}
                </span>
              </div>
            </div>

            {gameFinished ? (
              <div className="mb-4 rounded-2xl border border-(--app-accent)/40 bg-(--app-accent)/10 p-4 text-sm text-(--app-text)">
                <p className="font-semibold text-(--app-accent)">
                  Game finished
                </p>
                <p className="mt-1">{completionSummary}</p>
              </div>
            ) : null}

            {hintMessage ? (
              <div className="mb-4">
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
              hideWords={isViewerOperative ? hideBoard : false}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {isViewerSpymaster ? (
                <button
                  type="button"
                  onClick={() => {
                    const toggled = !showKeycard;
                    setShowKeycard(toggled);
                    if (toggled && socket && user?.telegramId !== undefined) {
                      socket.emit("game:requestKeycard", {
                        roomCode,
                        requesterTelegramId: user.telegramId,
                      });
                    }
                  }}
                  aria-label={showKeycard ? "Hide keycard" : "Show keycard"}
                  className="rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm font-medium text-(--app-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                >
                  {showKeycard ? "Hide keycard" : "Show keycard"}
                </button>
              ) : null}

              {isViewerOperative ? (
                <button
                  type="button"
                  aria-pressed={hideBoard}
                  aria-label={hideBoard ? "Show board" : "Hide board"}
                  onClick={() => {
                    setHideBoard((s) => {
                      const next = !s;
                      try {
                        localStorage.setItem(
                          "codenames.hideBoard",
                          next ? "true" : "false",
                        );
                      } catch {
                        // ignore
                      }
                      return next;
                    });
                  }}
                  className="rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm font-medium text-(--app-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                >
                  {hideBoard ? "Show board" : "Hide board"}
                </button>
              ) : null}

              {canPassTurn ? (
                <button
                  type="button"
                  aria-label="Pass turn"
                  onClick={handlePassTurn}
                  className="rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm font-medium text-(--app-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                >
                  Pass turn
                </button>
              ) : null}

              <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-3 text-sm text-(--app-muted)">
                <p className="font-semibold text-(--app-text)">
                  Board controls
                </p>
                <p className="mt-2">
                  {isViewerSpymaster
                    ? "Reveal your keycard when you are ready."
                    : "Tap cards on the board when your team has a valid hint."}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                    Hint panel
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-(--app-text)">
                    {state.game.currentHintWord ?? "No hint yet"}
                  </h2>
                </div>
                <span className="rounded-full bg-(--app-border)/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-(--app-text)">
                  {state.game.remainingGuesses} guess
                  {state.game.remainingGuesses === 1 ? "" : "es"}
                </span>
              </div>
              <p className="mt-3 text-sm text-(--app-muted)">
                Current turn: {state.game.currentTurn} · Starting team:{" "}
                {state.game.startingTeam}
              </p>
            </div>

            <div className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Submit a hint
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={handleSubmitHint}
                aria-label="Submit hint form"
              >
                <label htmlFor="hintWord" className="sr-only">
                  Hint word
                </label>
                <input
                  id="hintWord"
                  aria-label="Hint word"
                  value={hintDraft.word}
                  onChange={(event) =>
                    setHintDraft((current) => ({
                      ...current,
                      word: event.target.value,
                    }))
                  }
                  placeholder="Hint word"
                  className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm text-(--app-text) outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                  disabled={!canSubmitHint || hintSubmitting}
                />
                <label htmlFor="hintNumber" className="sr-only">
                  Hint number
                </label>
                <input
                  id="hintNumber"
                  aria-label="Hint number"
                  value={hintDraft.number}
                  onChange={(event) =>
                    setHintDraft((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                  placeholder="Number"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm text-(--app-text) outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                  disabled={!canSubmitHint || hintSubmitting}
                />
                <button
                  type="submit"
                  aria-label="Submit hint"
                  className="w-full rounded-full border border-(--app-border) bg-(--app-accent) px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg)"
                  disabled={!canSubmitHint || hintSubmitting}
                >
                  {hintSubmitting ? "Submitting…" : "Submit hint"}
                </button>
              </form>
            </div>

            <div className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Hint history
              </p>
              {state.game.hintHistory.length === 0 ? (
                <p className="mt-3 text-sm text-(--app-muted)">No hints yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {state.game.hintHistory
                    .slice()
                    .reverse()
                    .map((hint, index) => (
                      <li
                        key={`${hint.word}-${hint.submittedAt.toString()}-${index}`}
                        className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4"
                      >
                        <p className="font-semibold text-(--app-text)">
                          {hint.word}
                        </p>
                        <p className="mt-2 text-xs text-(--app-muted)">
                          {hint.number} guess{hint.number === 1 ? "" : "es"} •{" "}
                          {hint.team} team
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-muted)">
              <p>
                {user?.firstName
                  ? `${user.firstName}, this board is currently for display only.`
                  : "This board is currently for display only."}
              </p>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
