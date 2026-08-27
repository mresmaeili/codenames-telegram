import { useEffect, useMemo, useRef, useState } from "react";

import { BoardGrid } from "@/components/BoardGrid";
import { GameHeader } from "@/components/GameHeader";
import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { apiUrl } from "@/config/env";
import { useHeaderPopup } from "@/context/HeaderPopupContext";
import { useToast } from "@/context/ToastContext";
import { getSocketClient } from "@/socket/client";
import { isDevModeEnabled } from "@/lib/dev";
import {
  avatarUrlForPlayer,
  avatarUrlForName,
  avatarEmojiForPlayer,
} from "@/lib/avatar";
import type { GameView, HintEntry, Turn } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";

interface GamePageProps {
  roomCode: string;
  onLeave: () => void;
  onReturnToLobby: () => void;
}

interface GamePageState {
  room: Room | null;
  game: GameView | null;
  loading: boolean;
  error: string | null;
}

interface GameLogEntry {
  id: string;
  kind: "hint" | "reveal";
  team: Turn;
  word: string;
  number?: number;
  playerId: string | null;
  correct?: boolean;
}

function normalizeGameCounts(game: GameView): GameView {
  if (
    typeof game.redCardsRemaining === "number" &&
    typeof game.blueCardsRemaining === "number"
  ) {
    return game;
  }

  const boardIsUnrevealed = game.board.every((card) => !card.revealed);
  if (!boardIsUnrevealed) {
    return game;
  }

  return {
    ...game,
    redCardsRemaining: game.startingTeam === "red" ? 9 : 8,
    blueCardsRemaining: game.startingTeam === "blue" ? 9 : 8,
  };
}

function getPlayerCount(room: Room | null): number {
  return room?.players.length ?? 0;
}

export function GamePage({
  roomCode,
  onLeave,
  onReturnToLobby,
}: GamePageProps) {
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
  const { registerPopup, openPopup, closePopup } = useHeaderPopup();
  const [hideBoard, setHideBoard] = useState(() => {
    try {
      const raw = localStorage.getItem("codenames.hideBoard");
      return raw === "true";
    } catch (error) {
      return false;
    }
  });
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<
    number | null
  >(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const gameRef = useRef<GameView | null>(null);
  const roomRef = useRef<Room | null>(null);
  const logGameIdRef = useRef<string | null>(null);

  useEffect(() => {
    gameRef.current = state.game;
    roomRef.current = state.room;
    const gameId = state.game?.id ?? state.game?.roomId ?? null;
    if (gameId !== logGameIdRef.current) {
      logGameIdRef.current = gameId;
      setGameLog(
        state.game?.hintHistory.map((hint, index) => ({
          id: `hint-${hint.submittedAt}-${index}`,
          kind: "hint" as const,
          team: hint.team,
          word: hint.word,
          number: hint.number,
          playerId:
            state.room?.players.find(
              (player) =>
                player.team === hint.team && player.role === "spymaster",
            )?.userId ?? null,
        })) ?? [],
      );
    }
  }, [state.game]);

  useEffect(() => {
    const timerSetting = state.room?.settings.timer;
    const duration =
      timerSetting && timerSetting !== "none" ? Number(timerSetting) : null;
    if (!duration || !state.game || state.game.status !== "active") {
      setTurnSecondsRemaining(null);
      return;
    }

    const turnStartedAt =
      state.game.turnStartedAt ?? state.game.createdAt ?? new Date();
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000),
    );
    setTurnSecondsRemaining(Math.max(0, duration - elapsedSeconds));
    const interval = window.setInterval(() => {
      setTurnSecondsRemaining((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    roomCode,
    state.game?.currentTurn,
    state.game?.turnStartedAt,
    state.game?.status,
    state.room?.settings.timer,
    state.room?.players,
    user?.telegramId,
  ]);

  const blueCardsRemaining = state.game?.blueCardsRemaining ?? 0;
  const redCardsRemaining = state.game?.redCardsRemaining ?? 0;
  const blueSpymaster = state.room?.players.find(
    (player) => player.team === "blue" && player.role === "spymaster",
  );
  const redSpymaster = state.room?.players.find(
    (player) => player.team === "red" && player.role === "spymaster",
  );
  const blueOperatives =
    state.room?.players.filter(
      (p) => p.team === "blue" && p.role !== "spymaster",
    ) ?? [];
  const redOperatives =
    state.room?.players.filter(
      (p) => p.team === "red" && p.role !== "spymaster",
    ) ?? [];

  async function loadGameData() {
    try {
      const roomResponse = await fetch(apiUrl(`/api/rooms/${roomCode}`));
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
      const gameResponse = await fetch(apiUrl(gameUrl));

      if (!gameResponse.ok) {
        throw new Error("Unable to load the game board.");
      }

      const game = normalizeGameCounts((await gameResponse.json()) as GameView);

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
          if (room.status === "waiting") {
            onReturnToLobby();
            return;
          }
          setState((current) => ({ ...current, room, error: null }));
        }
      };

      const handleGameInitialized = (payload: {
        redCardsRemaining?: number;
        blueCardsRemaining?: number;
      }) => {
        if (isMounted) {
          if (
            typeof payload?.redCardsRemaining === "number" &&
            typeof payload?.blueCardsRemaining === "number"
          ) {
            setState((current) => ({
              ...current,
              game: current.game
                ? {
                    ...current.game,
                    redCardsRemaining: payload.redCardsRemaining,
                    blueCardsRemaining: payload.blueCardsRemaining,
                  }
                : current.game,
            }));
          }
          setIsReconnecting(true);
          toast.success("Game starting. Loading board...");
          void loadGameData();
        }
      };

      const handleGameReset = () => {
        if (isMounted) {
          onReturnToLobby();
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
          setGameLog((current) => [
            ...current,
            {
              id: `hint-${payload.hintSubmittedAt ?? Date.now()}`,
              kind: "hint",
              team:
                payload.hintHistory[payload.hintHistory.length - 1]?.team ??
                "red",
              word: payload.currentHintWord ?? "Hint",
              number: payload.currentHintNumber ?? undefined,
              playerId:
                roomRef.current?.players.find(
                  (player) =>
                    player.team ===
                      (payload.hintHistory[payload.hintHistory.length - 1]
                        ?.team ?? "red") && player.role === "spymaster",
                )?.userId ?? null,
            },
          ]);
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
        redCardsRemaining: number;
        blueCardsRemaining: number;
        currentHintWord: string | null;
        currentHintNumber: number | null;
        status: string;
        selectedCardId: string | null;
        selectedByPlayerId: string | null;
        selectedAt: string | null;
        winningTeam: GameView["winningTeam"];
        completionReason: GameView["completionReason"];
        completedAt: string | null;
        turnStartedAt: string | null;
        revealedCardIndex?: number;
        revealedCardColor?: GameView["board"][number]["color"];
        revealedByPlayerId?: string | null;
      }) => {
        if (isMounted) {
          const revealingTeam = gameRef.current?.currentTurn ?? "red";
          const revealedIndex =
            typeof payload.revealedCardIndex === "number"
              ? payload.revealedCardIndex
              : payload.board.findIndex(
                  (card, index) =>
                    card.revealed && !gameRef.current?.board[index]?.revealed,
                );
          const revealedCard =
            revealedIndex >= 0 ? payload.board[revealedIndex] : null;
          if (revealedCard) {
            setGameLog((current) => [
              ...current,
              {
                id: `reveal-${revealedIndex}-${Date.now()}`,
                kind: "reveal",
                team: revealingTeam,
                word: revealedCard.word,
                playerId:
                  payload.revealedByPlayerId ??
                  gameRef.current?.selectedByPlayerId ??
                  null,
                correct:
                  (payload.revealedCardColor ?? revealedCard.color) ===
                  revealingTeam,
              },
            ]);
          }
          setState((current) => ({
            ...current,
            game: current.game
              ? {
                  ...current.game,
                  board: payload.board,
                  currentTurn: payload.currentTurn as GameView["currentTurn"],
                  remainingGuesses: payload.remainingGuesses,
                  redCardsRemaining:
                    typeof payload.redCardsRemaining === "number"
                      ? payload.redCardsRemaining
                      : current.game.redCardsRemaining,
                  blueCardsRemaining:
                    typeof payload.blueCardsRemaining === "number"
                      ? payload.blueCardsRemaining
                      : current.game.blueCardsRemaining,
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
                  turnStartedAt: payload.turnStartedAt
                    ? new Date(payload.turnStartedAt)
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
        turnStartedAt: string | null;
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
                  turnStartedAt: payload.turnStartedAt
                    ? new Date(payload.turnStartedAt)
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
      socket.on("game:selected", handleSelected);
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
        socket.off("game:selected", handleSelected);
        socket.off("game:revealed", handleRevealed);
        socket.off("game:passed", handlePassed);
        socket.off("game:error", handleGameError);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [onReturnToLobby, roomCode, socket, user?.telegramId]);

  const viewerPlayer = state.room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );
  const isActiveSpymaster =
    Boolean(viewerPlayer) &&
    viewerPlayer?.team === state.game?.currentTurn &&
    state.game?.role === "spymaster" &&
    state.game?.status === "active";
  const isActiveOperative =
    Boolean(viewerPlayer) &&
    viewerPlayer?.team === state.game?.currentTurn &&
    state.game?.role === "operative" &&
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
    state.game?.remainingGuesses > 0;
  const opposingTeam: Turn = state.game?.currentTurn === "red" ? "blue" : "red";
  const canPassTurn =
    state.game?.status === "active" &&
    (turnSecondsRemaining === 0
      ? viewerPlayer?.team === state.game.currentTurn ||
        viewerPlayer?.team === opposingTeam
      : isActiveOperative && hasActiveHint);
  const canFinishTimedOutTurn =
    turnSecondsRemaining === 0 && state.game?.status === "active";
  const canTakeTurn =
    canFinishTimedOutTurn && viewerPlayer?.team === opposingTeam;
  const gameFinished = state.game?.status === "finished";
  const roomSettings = state.room?.settings;
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
        state.room?.ownerIds?.includes(player.telegramId),
    ),
  );
  const isRoomCreator = Boolean(
    state.room &&
    user?.telegramId !== undefined &&
    state.room.ownerId === user.telegramId,
  );

  useEffect(() => {
    if (!state.room) {
      return;
    }

    registerPopup(
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            Room settings
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="rounded-full border border-(--app-border) px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        {isRoomOwner ? (
          <div className="space-y-3">
            {/* Allow spectators and Private room controls removed from popup */}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResetTeams}
                className="flex-1 rounded-full border border-(--app-border) px-4 py-2 text-sm font-semibold"
              >
                Reset teams
              </button>
              <button
                type="button"
                onClick={handleShuffleTeams}
                className="flex-1 rounded-full border border-(--app-border) px-4 py-2 text-sm font-semibold"
              >
                Randomize teams
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-3 text-sm text-(--app-muted)">
            Only the room owner can change settings.
          </div>
        )}
      </div>,
      "Room settings",
    );
  }, [registerPopup, isRoomOwner, state.room]);

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

  function handleResetTeams() {
    if (!socket || !state.room || !user) return;
    socket.emit("room:resetTeams", {
      roomCode: state.room.roomCode,
      ownerTelegramId: user.telegramId,
    });
  }

  function handleShuffleTeams() {
    if (!socket || !state.room || !user) return;
    socket.emit("room:shuffleTeams", {
      roomCode: state.room.roomCode,
      ownerTelegramId: user.telegramId,
    });
  }

  function handleReturnToLobby() {
    onReturnToLobby();
  }

  function handleRematch() {
    const activeSocket = getSocketClient();
    if (!state.room || !user?.telegramId || !activeSocket) {
      setHintMessage("Unable to request a rematch.");
      return;
    }

    activeSocket.emit("room:resetGame", {
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
      const activeSocket = getSocketClient();
      if (!activeSocket) {
        throw new Error("Socket connection is unavailable.");
      }

      activeSocket.emit("game:hint", {
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

  // Click wrapper so we can call the form submit logic from a button
  async function handleSubmitHintClick() {
    await handleSubmitHint({
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>);
  }

  async function refreshGameState() {
    setRefreshingGame(true);
    await loadGameData();
    setRefreshingGame(false);
  }

  function handleSelectCard(cardIndex: number) {
    if (!state.game || !user?.telegramId || !canSelectCard || hintSubmitting) {
      return;
    }

    const activeSocket = getSocketClient();
    if (!activeSocket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    activeSocket.emit("game:select", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
      cardId: String(cardIndex),
      confirm: false,
    });
  }

  function handleConfirmSelection() {
    if (
      !state.game ||
      !user?.telegramId ||
      state.game.selectedCardId === null
    ) {
      return;
    }

    const activeSocket = getSocketClient();
    if (!activeSocket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    activeSocket.emit("game:select", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
      cardId: state.game.selectedCardId,
      confirm: true,
    });
  }

  function handleConfirmCard(cardIndex: number) {
    if (
      !state.game ||
      !user?.telegramId ||
      state.game.selectedCardId !== String(cardIndex)
    ) {
      return;
    }

    handleConfirmSelection();
  }

  function handlePassTurn() {
    if (!state.game || !user?.telegramId || !canPassTurn || hintSubmitting) {
      return;
    }

    const activeSocket = getSocketClient();
    if (!activeSocket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }

    activeSocket.emit("game:pass", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
      timeout: turnSecondsRemaining === 0,
    });
  }

  function handleTakeTurn() {
    if (!state.game || !user?.telegramId || !canTakeTurn) return;
    const activeSocket = getSocketClient();
    if (!activeSocket) {
      setHintMessage("Socket connection is unavailable.");
      return;
    }
    activeSocket.emit("game:pass", {
      gameId: state.game.id ?? state.game.roomId,
      roomCode: roomCode.toUpperCase(),
      telegramId: user.telegramId,
      timeout: true,
    });
  }

  function handleAssignPlayerFromGame(
    targetTelegramId: number,
    team: "blue" | "red" | null,
    role: "operative" | "spymaster",
  ) {
    if (!socket || !state.room || !user || !isRoomOwner) {
      toast.error("Only room admins can assign players.");
      return;
    }

    socket.emit("room:assignPlayer", {
      roomCode: state.room.roomCode,
      actorTelegramId: user.telegramId,
      targetTelegramId,
      team,
      role,
    });
    closePopup();
  }

  function handleGamePlayerClick(player: Room["players"][number]) {
    if (!isRoomOwner || !state.room || !user) {
      return;
    }

    const isAdmin = state.room.ownerIds.includes(player.telegramId);
    const isCreator = player.telegramId === state.room.ownerId;
    registerPopup(
      <div className="space-y-3">
        <p className="text-center text-lg font-black text-white">
          {player.displayName}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["blue", "operative", "Blue operatives"],
            ["red", "operative", "Red operatives"],
            ["blue", "spymaster", "Blue spymasters"],
            ["red", "spymaster", "Red spymasters"],
          ].map(([team, role, label]) => (
            <button
              key={`${team}-${role}`}
              type="button"
              onClick={() =>
                handleAssignPlayerFromGame(
                  player.telegramId,
                  team as "blue" | "red",
                  role as "operative" | "spymaster",
                )
              }
              className={`rounded-full px-3 py-3 text-sm font-black text-white ${team === "blue" ? "bg-[#149dde]" : "bg-[#ff554b]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            handleAssignPlayerFromGame(player.telegramId, null, "operative")
          }
          className="w-full rounded-full border-2 border-white px-3 py-3 text-sm font-black text-white"
        >
          Spectators
        </button>
        {isRoomCreator && !isCreator ? (
          <button
            type="button"
            onClick={() => {
              socket?.emit("room:setAdmin", {
                roomCode: state.room?.roomCode,
                creatorTelegramId: user.telegramId,
                targetTelegramId: player.telegramId,
                isAdmin: !isAdmin,
              });
              closePopup();
            }}
            className="w-full rounded-full bg-[#2fd000] px-3 py-3 text-sm font-black text-white"
          >
            {isAdmin ? "Remove admin" : "Promote"}
          </button>
        ) : null}
      </div>,
      "Assign role",
    );
    openPopup();
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
        <div className="space-y-4 rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
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
      <div className="mx-auto w-full max-w-150 bg-[#0b69ad] px-2 pb-4 pt-2 text-white">
        {" "}
        <div className="sticky top-0 z-10 flex gap-2 py-2">
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 active:bg-white/30"
          >
            Exit
          </button>
        </div>{" "}
        {devMode ? (
          <div className="mb-3 rounded-3xl border border-white/20 bg-[#0d4aa3] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                  Dev inspector
                </p>
                <p className="mt-1 text-sm text-white/80">
                  Manual refresh and raw state.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshGameState}
                disabled={refreshingGame}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {refreshingGame ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        ) : null}
        {isReconnecting ? (
          <div className="mb-3">
            <StatusPanel
              title="Reconnecting"
              description="Syncing the latest room and board state."
              tone="info"
            />
          </div>
        ) : null}
        <div className="mb-3">
          <GameHeader
            room={state.room}
            game={state.game}
            playerCount={getPlayerCount(state.room)}
          />
        </div>
        {gameFinished ? (
          <div className="mb-3 rounded-3xl border border-white/20 bg-black/20 p-4">
            <p className="text-lg font-black uppercase tracking-tight">
              Game complete
            </p>
            <p className="mt-1 text-sm text-white/80">
              {completionSummary ?? "All cards are revealed."}
            </p>
            {isRoomOwner ? (
              <button
                type="button"
                onClick={handleRematch}
                className="mt-3 w-full rounded-full bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#0a63d4]"
              >
                Reset game and return to lobby
              </button>
            ) : (
              <p className="mt-3 text-sm text-white/70">
                Waiting for the room admin to reset the game.
              </p>
            )}
          </div>
        ) : null}
        {roomSettings ? (
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              Timer:{" "}
              {roomSettings.timer === "none" ? "Off" : `${roomSettings.timer}s`}
            </div>
            {turnSecondsRemaining !== null ? (
              <div className="rounded-2xl bg-white/10 px-3 py-2">
                Turn left: {turnSecondsRemaining}s
              </div>
            ) : null}
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              Language: {roomSettings.language}
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2">
              Pack: {roomSettings.wordPack}
            </div>
          </div>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/75 bg-[#1f5fae] px-3 py-2 text-white"
            aria-label="Player count"
          >
            <span className="text-2xl">👥</span>
            <span className="text-base font-semibold">
              {getPlayerCount(state.room)}
            </span>
          </button>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/75 bg-[#1f5fae] text-2xl text-white"
            aria-label="Room settings"
            onClick={() => setShowKeycard((current) => !current)}
          >
            ⚙
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] grid-rows-2 gap-1.5">
          <div className="col-start-1 row-start-1 rounded-xl border-2 border-[#76f21b] bg-[#159dce] p-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
                Operatives
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-5xl font-black leading-none">
                {blueCardsRemaining}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  {blueOperatives.slice(0, 3).map((p) => (
                    <button
                      key={p.userId}
                      type="button"
                      onClick={() => handleGamePlayerClick(p)}
                      disabled={!isRoomOwner}
                      className="rounded-full disabled:cursor-default"
                      aria-label={`Manage ${p.displayName}`}
                    >
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        title={p.displayName}
                        className="h-8 w-8 rounded-full border-2 border-white/60 object-cover"
                      />
                    </button>
                  ))}
                  {blueOperatives.length === 0 ? (
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xl">
                      🐟
                    </div>
                  ) : null}
                  {blueOperatives.length > 3 ? (
                    <div className="ml-2 rounded-full bg-white/10 px-2 py-1 text-xs">
                      +{blueOperatives.length - 3}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="col-start-2 row-span-2 row-start-1 h-53 overflow-y-auto rounded-xl border-2 border-[#777] bg-[#3e3e3e] p-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              Game log
            </div>
            <div className="mt-2 space-y-1.5 text-left text-[10px] text-white/80">
              {gameLog.length > 0 ? (
                gameLog.map((entry) => {
                  const player = state.room?.players.find(
                    (roomPlayer) => roomPlayer.userId === entry.playerId,
                  );
                  const teamColor =
                    entry.team === "blue"
                      ? {
                          border: "border-cyan-300",
                          badge: "bg-[#08a6d0]",
                          row: "bg-[#159dce]",
                        }
                      : {
                          border: "border-red-300",
                          badge: "bg-[#d84c3e]",
                          row: "bg-[#c94b3b]",
                        };

                  return (
                    <div key={entry.id} className="flex items-end gap-1.5">
                      <img
                        src={avatarUrlForPlayer(player)}
                        alt={player?.displayName ?? entry.team}
                        title={player?.displayName ?? entry.team}
                        className={`h-7 w-7 shrink-0 rounded-full border-2 object-cover ${teamColor.border}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1">
                          <span
                            className={`max-w-full truncate rounded-sm px-1 text-[9px] font-black uppercase ${teamColor.badge}`}
                          >
                            {player?.displayName ?? entry.team}
                          </span>
                          {entry.kind === "hint" ? (
                            <span className="text-[8px] uppercase text-white/60">
                              hint
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-1 font-black text-white ${teamColor.row}`}
                        >
                          <span className="min-w-0 flex-1 truncate uppercase">
                            {entry.word}
                          </span>
                          {entry.number !== undefined ? (
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-black">
                              {entry.number}
                            </span>
                          ) : null}
                          {entry.kind === "reveal" ? (
                            <span
                              className={
                                entry.correct ? "text-lime-300" : "text-red-200"
                              }
                              aria-label={
                                entry.correct ? "Correct guess" : "Wrong guess"
                              }
                            >
                              {entry.correct ? "✓" : "×"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg bg-black/55 px-2 py-1.5 text-center">
                  No hint yet
                </div>
              )}
            </div>
          </div>

          <div className="col-start-3 row-start-1 rounded-xl border-2 border-[#e88963] bg-[#c94b3b] p-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
                Operatives
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-5xl font-black leading-none">
                {redCardsRemaining}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  {redOperatives.slice(0, 3).map((p) => (
                    <button
                      key={p.userId}
                      type="button"
                      onClick={() => handleGamePlayerClick(p)}
                      disabled={!isRoomOwner}
                      className="rounded-full disabled:cursor-default"
                      aria-label={`Manage ${p.displayName}`}
                    >
                      <img
                        src={avatarUrlForPlayer(p)}
                        alt={p.displayName}
                        title={p.displayName}
                        className="h-8 w-8 rounded-full border-2 border-white/60 object-cover"
                      />
                    </button>
                  ))}
                  {redOperatives.length === 0 ? (
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xl">
                      🐙
                    </div>
                  ) : null}
                  {redOperatives.length > 3 ? (
                    <div className="ml-2 rounded-full bg-white/10 px-2 py-1 text-xs">
                      +{redOperatives.length - 3}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="col-start-1 row-start-2 rounded-xl border-2 border-[#23d4ff] bg-[#168fc5] p-1.5 text-white">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
              Spymasters
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 relative">
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    blueSpymaster && handleGamePlayerClick(blueSpymaster)
                  }
                  disabled={!isRoomOwner || !blueSpymaster}
                  className="h-12 w-12 overflow-hidden rounded-full border-4 border-[#9ef3ff] bg-white/10 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
                  aria-label={
                    blueSpymaster
                      ? `Manage ${blueSpymaster.displayName}`
                      : "No blue spymaster"
                  }
                >
                  {blueSpymaster ? (
                    <img
                      src={avatarUrlForPlayer(blueSpymaster)}
                      alt={blueSpymaster.displayName}
                      title={blueSpymaster.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🐟</span>
                  )}
                </button>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {blueSpymaster?.displayName ?? "None"}
                </div>
              </div>
            </div>
          </div>

          <div className="col-start-3 row-start-2 rounded-xl border-2 border-[#f39b84] bg-[#c94b3b] p-1.5 text-white">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
              Spymasters
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 relative">
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() =>
                    redSpymaster && handleGamePlayerClick(redSpymaster)
                  }
                  disabled={!isRoomOwner || !redSpymaster}
                  className="h-12 w-12 overflow-hidden rounded-full border-4 border-[#ffc3be] bg-white/10 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
                  aria-label={
                    redSpymaster
                      ? `Manage ${redSpymaster.displayName}`
                      : "No red spymaster"
                  }
                >
                  {redSpymaster ? (
                    <img
                      src={avatarUrlForPlayer(redSpymaster)}
                      alt={redSpymaster.displayName}
                      title={redSpymaster.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🐙</span>
                  )}
                </button>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {redSpymaster?.displayName ?? "None"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[clamp(1rem,4vw,1.45rem)] font-black uppercase leading-none tracking-tight text-white">
          {isViewerSpymaster
            ? "Give your operatives a clue"
            : isViewerOperative
              ? hasActiveHint
                ? "Pick a word"
                : "Wait for your spymaster's clue"
              : "Watch the turn"}
        </div>
        <div className="mt-2 rounded-[10px] border border-white/15 bg-[#0879b8] p-1.5">
          <BoardGrid
            cards={state.game.board}
            role={state.game.role}
            selectedCardId={state.game.selectedCardId}
            canSelectCard={canSelectCard}
            onSelectCard={handleSelectCard}
            onConfirmCard={handleConfirmCard}
            hideWords={isViewerOperative ? hideBoard : false}
          />
        </div>
        {canSubmitHint ? (
          <form
            onSubmit={handleSubmitHint}
            className="mt-4 flex items-end gap-2 rounded-full bg-[#2b2b2b] p-2 shadow-inner"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <label
                htmlFor="hintWord"
                className="text-xs uppercase tracking-[0.18em] text-white/70"
              >
                Hint Word
              </label>
              <input
                id="hintWord"
                type="text"
                value={hintDraft.word}
                onChange={(e) =>
                  setHintDraft((current) => ({
                    ...current,
                    word: e.target.value,
                  }))
                }
                placeholder="Enter one word (no spaces)"
                disabled={hintSubmitting}
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 disabled:opacity-60"
                autoFocus
              />
            </div>

            <div className="w-24 shrink-0 space-y-2">
              <label
                htmlFor="hintNumber"
                className="text-xs uppercase tracking-[0.18em] text-white/70"
              >
                Number of Cards (1-25)
              </label>
              <input
                id="hintNumber"
                type="number"
                min="1"
                max="25"
                value={hintDraft.number}
                onChange={(e) =>
                  setHintDraft((current) => ({
                    ...current,
                    number: e.target.value,
                  }))
                }
                placeholder="How many cards?"
                disabled={hintSubmitting}
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={
                hintSubmitting || !hintDraft.word.trim() || !hintDraft.number
              }
              aria-label="Send hint"
              className="flex h-12 shrink-0 items-center justify-center rounded-full bg-[#24d16b] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {hintSubmitting ? "..." : "Send"}
            </button>
          </form>
        ) : hasActiveHint ? (
          <div className="mt-4 flex items-center gap-3 rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
            <div className="flex-1 rounded-full bg-white/90 px-4 py-3 text-left text-xl font-black uppercase tracking-tight text-black">
              {state.game.currentHintWord} ({state.game.currentHintNumber})
            </div>
            {canPassTurn || canTakeTurn ? (
              <button
                type="button"
                onClick={canTakeTurn ? handleTakeTurn : handlePassTurn}
                className="rounded-full bg-white px-4 py-3 text-sm font-black uppercase text-[#0a63d4]"
                aria-label={canTakeTurn ? "Take turn" : "Pass turn"}
              >
                {canTakeTurn ? "Take turn" : "Pass"}
              </button>
            ) : null}
          </div>
        ) : canPassTurn || canTakeTurn ? (
          <div className="mt-4 flex items-center justify-end rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
            <button
              type="button"
              onClick={canTakeTurn ? handleTakeTurn : handlePassTurn}
              className="rounded-full bg-white px-4 py-3 text-sm font-black uppercase text-[#0a63d4]"
              aria-label={canTakeTurn ? "Take turn" : "Pass turn"}
            >
              {canTakeTurn ? "Take turn" : "Pass"}
            </button>
          </div>
        ) : isActiveOperative ? (
          <div className="mt-4 flex items-center gap-3 rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
            <div className="flex-1 px-2 text-left text-sm font-semibold text-white/80">
              Your spymaster has not given a clue yet.
            </div>
          </div>
        ) : null}
        {hintMessage ? (
          <div className="mt-3">
            <StatusPanel
              title="Board update"
              description={hintMessage}
              tone="info"
            />
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
