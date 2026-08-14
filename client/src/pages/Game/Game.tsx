import { useEffect, useMemo, useState } from "react";

import { BoardGrid } from "@/components/BoardGrid";
import { GameHeader } from "@/components/GameHeader";
import { EndGameModal } from "@/components/EndGameModal";
import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
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
  const { registerPopup, closePopup } = useHeaderPopup();
  const [hideBoard, setHideBoard] = useState(() => {
    try {
      const raw = localStorage.getItem("codenames.hideBoard");
      return raw === "true";
    } catch (error) {
      return false;
    }
  });

  const blueCardsRemaining =
    state.game?.board.filter((card) => card.color === "blue" && !card.revealed)
      .length ?? 0;
  const redCardsRemaining =
    state.game?.board.filter((card) => card.color === "red" && !card.revealed)
      .length ?? 0;
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
        state.room?.ownerIds?.includes(player.telegramId),
    ),
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
      <div className="mx-auto w-full max-w-[560px] bg-[#0a63d4] px-3 pb-5 pt-3 text-white">
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
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-3xl border border-white/10 bg-[#2d9bff] p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
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
                    <img
                      key={p.userId}
                      src={avatarUrlForPlayer(p)}
                      alt={p.displayName}
                      title={p.displayName}
                      className="h-8 w-8 rounded-full border-2 border-white/60 object-cover"
                    />
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

          <div className="rounded-3xl border border-white/10 bg-[#6f7277] p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              Game log
            </div>
            <div className="mt-3 rounded-2xl bg-black/65 p-2 text-center text-[10px] text-white/80">
              {state.game.currentHintWord
                ? `${state.game.currentHintWord} (${state.game.currentHintNumber})`
                : "No hint yet"}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#ef5c48] p-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
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
                    <img
                      key={p.userId}
                      src={avatarUrlForPlayer(p)}
                      alt={p.displayName}
                      title={p.displayName}
                      className="h-8 w-8 rounded-full border-2 border-white/60 object-cover"
                    />
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
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-3xl border border-[#9ef3ff] bg-[#2ca4ff] p-2 text-white">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
              Spymasters
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 relative">
              <div className="relative flex items-center justify-center">
                <div className="h-12 w-12 overflow-hidden rounded-full border-4 border-[#9ef3ff] bg-white/10 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
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
                </div>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {blueSpymaster?.displayName ?? "None"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#ffc3be] bg-[#ef5c48] p-2 text-white">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
              Spymasters
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 relative">
              <div className="relative flex items-center justify-center">
                <div className="h-12 w-12 overflow-hidden rounded-full border-4 border-[#ffc3be] bg-white/10 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
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
                </div>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {redSpymaster?.displayName ?? "None"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-[22px] font-black uppercase tracking-tight text-white">
          Give your operatives a clue
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-[#0a63d4] p-2">
          <BoardGrid
            cards={state.game.board}
            role={state.game.role}
            selectedCardId={state.game.selectedCardId}
            canSelectCard={canSelectCard}
            onSelectCard={handleSelectCard}
            hideWords={isViewerOperative ? hideBoard : false}
          />
        </div>
        {canSubmitHint ? (
          <form onSubmit={handleSubmitHint} className="mt-4 space-y-3">
            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={
                  hintSubmitting || !hintDraft.word.trim() || !hintDraft.number
                }
                className="flex-1 rounded-full bg-[#24d16b] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {hintSubmitting ? "Submitting..." : "Submit Hint"}
              </button>
            </div>
          </form>
        ) : hasActiveHint ? (
          <div className="mt-4 flex items-center gap-3 rounded-full bg-[#2b2b2b] px-3 py-3 shadow-inner">
            <div className="flex-1 rounded-full bg-white/90 px-4 py-3 text-left text-xl font-black uppercase tracking-tight text-black">
              {state.game.currentHintWord} ({state.game.currentHintNumber})
            </div>
            {isActiveOperative ? (
              <button
                type="button"
                onClick={handlePassTurn}
                disabled={!canPassTurn || hintSubmitting}
                aria-label="Pass turn"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffb84d] text-xl font-bold text-black hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 disabled:opacity-60"
              >
                ⏭
              </button>
            ) : null}
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
