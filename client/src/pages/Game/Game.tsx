import { useEffect, useMemo, useState } from "react";

import { GameLog, type GameLogEntry } from "./GameLog";
import { TeamPanel } from "./TeamPanel";
import { SpymasterPanel } from "./SpymasterPanel";
import { TurnBanner } from "./TurnBanner";
import { useGameActions } from "./useGameActions";
import { HintComposer } from "./HintComposer";
import { useGameStateSync } from "./useGameStateSync";
import { useRoomSocketSync } from "./useRoomSocketSync";
import { GameBoardSurface } from "./GameBoardSurface";
import { TurnActionBar } from "./TurnActionBar";
import { GameHeaderBar } from "./GameHeaderBar";
import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { apiUrl } from "@/config/env";
import { useHeaderPopup } from "@/context/HeaderPopupContext";
import { useToast } from "@/context/ToastContext";
import { getSocketClient } from "@/socket/client";
import {
  avatarUrlForPlayer,
  avatarUrlForName,
  avatarEmojiForPlayer,
} from "@/lib/avatar";
import type { GameView, HintEntry } from "@/../shared/src/types/game";
import type { Room } from "@/../shared/src/types/room";
import {
  canPassTurn as canPassTurnForViewer,
  canSelectCard as canSelectCardForViewer,
  canSubmitHint as canSubmitHintForViewer,
  canTakeTurn as canTakeTurnForViewer,
  hasActiveHint as hasActiveHintForGame,
  isActiveRole,
} from "./gameSelectors";

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

function GameLoadingState() {
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

function GameErrorState({
  error,
  onLeave,
}: {
  error: string | null;
  onLeave: () => void;
}) {
  return (
    <PageContainer>
      <div className="space-y-4 rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
        <StatusPanel
          title="Board unavailable"
          description={
            error ??
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

function GameMetaSummary({
  roomSettings,
  spymasterSecondsRemaining,
  operativeSecondsRemaining,
}: {
  roomSettings: Room["settings"] | undefined;
  spymasterSecondsRemaining: number | null;
  operativeSecondsRemaining: number | null;
}) {
  if (!roomSettings) {
    return null;
  }

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
      <div className="rounded-2xl bg-white/10 px-3 py-2">
        Timer:{" "}
        {roomSettings.timer === "none" ? "Off" : `${roomSettings.timer}s`}
      </div>
      {spymasterSecondsRemaining !== null ? (
        <div className="rounded-2xl bg-white/10 px-3 py-2">
          Spymaster: {spymasterSecondsRemaining}s
        </div>
      ) : null}
      {operativeSecondsRemaining !== null ? (
        <div className="rounded-2xl bg-white/10 px-3 py-2">
          Operatives: {operativeSecondsRemaining}s
        </div>
      ) : null}
      <div className="rounded-2xl bg-white/10 px-3 py-2">
        Language: {roomSettings.language}
      </div>
      <div className="rounded-2xl bg-white/10 px-3 py-2">
        Pack: {roomSettings.wordPack}
      </div>
    </div>
  );
}

function RoomSettingsPopupContent({
  room,
  isRoomOwner,
  onClose,
  onResetTeams,
  onShuffleTeams,
}: {
  room: Room;
  isRoomOwner: boolean;
  onClose: () => void;
  onResetTeams: () => void;
  onShuffleTeams: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
          Room settings
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-(--app-border) px-3 py-1 text-sm"
        >
          Close
        </button>
      </div>
      <div className="rounded-[22px] bg-black px-4 py-4">
        <p className="text-center text-base font-black text-white">
          Players in the room
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {room.players.map((roomPlayer) => (
            <div
              key={roomPlayer.userId}
              className="flex w-16 flex-col items-center gap-1"
            >
              <img
                src={avatarUrlForPlayer(roomPlayer)}
                alt={roomPlayer.displayName}
                className="h-11 w-11 rounded-full border-2 border-white object-cover"
              />
              <span className="max-w-16 truncate rounded-sm bg-white/15 px-1 text-[10px] font-bold text-white">
                {roomPlayer.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isRoomOwner ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onResetTeams}
              className="flex-1 rounded-full border border-(--app-border) px-4 py-2 text-sm font-semibold"
            >
              Reset teams
            </button>
            <button
              type="button"
              onClick={onShuffleTeams}
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
    </div>
  );
}

function PlayerAssignmentPopupContent({
  player,
  isRoomCreator,
  isCreator,
  isAdmin,
  onAssign,
  onToggleAdmin,
}: {
  player: Room["players"][number];
  isRoomCreator: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  onAssign: (
    team: "blue" | "red" | null,
    role: "operative" | "spymaster",
  ) => void;
  onToggleAdmin: () => void;
}) {
  return (
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
              onAssign(
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
        onClick={() => onAssign(null, "operative")}
        className="w-full rounded-full border-2 border-white px-3 py-3 text-sm font-black text-white"
      >
        Spectators
      </button>
      {isRoomCreator && !isCreator ? (
        <button
          type="button"
          onClick={onToggleAdmin}
          className="w-full rounded-full bg-[#2fd000] px-3 py-3 text-sm font-black text-white"
        >
          {isAdmin ? "Remove admin" : "Promote"}
        </button>
      ) : null}
    </div>
  );
}

function PlayerRosterPopupContent({
  room,
  canManagePlayers,
  onPlayerClick,
}: {
  room: Room;
  canManagePlayers: boolean;
  onPlayerClick: (player: Room["players"][number]) => void;
}) {
  const groups = [
    {
      key: "blue",
      label: "Blue team",
      players: room.players.filter((player) => player.team === "blue"),
      labelClass: "text-[#75e5ff]",
    },
    {
      key: "red",
      label: "Red team",
      players: room.players.filter((player) => player.team === "red"),
      labelClass: "text-[#ffaaa0]",
    },
    {
      key: "spectators",
      label: "Spectators",
      players: room.players.filter((player) => player.team === null),
      labelClass: "text-white/65",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-white/70">
        Room players
      </p>
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <p
            className={`text-[10px] font-black uppercase tracking-[0.16em] ${group.labelClass}`}
          >
            {group.label}
          </p>
          {group.players.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {group.players.map((player) => {
                const borderClass =
                  player.team === "blue"
                    ? "border-[#37c8ff]"
                    : player.team === "red"
                      ? "border-[#ff7666]"
                      : "border-white/50";

                return (
                  <button
                    key={player.userId}
                    type="button"
                    onClick={() => onPlayerClick(player)}
                    disabled={!canManagePlayers}
                    className="flex w-16 flex-col items-center gap-1 text-white disabled:cursor-default"
                    aria-label={`${canManagePlayers ? "Manage" : "View"} ${player.displayName}`}
                  >
                    <img
                      src={avatarUrlForPlayer(player)}
                      alt={player.displayName}
                      className={`h-11 w-11 rounded-full border-3 object-cover shadow-[0_3px_8px_rgba(0,0,0,0.3)] ${borderClass}`}
                    />
                    <span className="w-full truncate text-center text-[10px] font-bold">
                      {player.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/45">None</p>
          )}
        </div>
      ))}
      {!canManagePlayers ? (
        <p className="text-center text-xs text-white/60">
          Only room admins can assign roles.
        </p>
      ) : null}
    </div>
  );
}

function logEntriesFromRounds(game: GameView): GameLogEntry[] {
  return (game.rounds ?? []).flatMap((round) => [
    {
      id: `hint-${round.id}`,
      kind: "hint" as const,
      team: round.team,
      word: round.hint.word,
      number: round.hint.number,
      playerId: round.hint.playerId ?? null,
    },
    ...round.guesses.map((guess) => ({
      id: `${round.id}-${guess.cardIndex}-${guess.revealedAt}`,
      kind: "reveal" as const,
      team: round.team,
      word: guess.word,
      playerId: guess.playerId,
      correct: guess.correct,
      color: game.board[guess.cardIndex]?.color ?? null,
    })),
    ...(round.passes ?? []).map((pass, index) => ({
      id: `${round.id}-pass-${index}-${pass.passedAt}`,
      kind: "pass" as const,
      team: round.team,
      word: "Pass",
      playerId: pass.playerId,
    })),
  ]);
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

function getSpectatorCount(room: Room | null): number {
  return room?.players.filter((player) => player.team === null).length ?? 0;
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
  const [selectedHintCardIds, setSelectedHintCardIds] = useState<Set<number>>(
    new Set(),
  );
  const [hintSubmitting, setHintSubmitting] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socket = useMemo(() => getSocketClient(), []);

  const [refreshingGame, setRefreshingGame] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const toast = useToast();
  const { registerPopup, openPopup, closePopup } = useHeaderPopup();
  const [spymasterSecondsRemaining, setSpymasterSecondsRemaining] = useState<
    number | null
  >(null);
  const [operativeSecondsRemaining, setOperativeSecondsRemaining] = useState<
    number | null
  >(null);
  const gameLog = state.game ? logEntriesFromRounds(state.game) : [];
  const [selectedPlayersByCard, setSelectedPlayersByCard] = useState<
    Record<number, Room["players"]>
  >({});

  useGameStateSync(socket, ({ room, game }) => {
    setState({ room, game, loading: false, error: null });
    setIsReconnecting(false);
  });

  useRoomSocketSync({
    socket,
    onRoomUpdated: (room) => {
      if (room.status === "waiting") {
        onReturnToLobby();
        return;
      }
      setState((current) => ({ ...current, room, error: null }));
    },
    onRoomReset: onReturnToLobby,
  });

  useEffect(() => {
    setSelectedPlayersByCard({});
  }, [state.game?.id, state.game?.roomId]);

  useEffect(() => {
    setSelectedPlayersByCard((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(
          ([index]) => !state.game?.board[Number(index)]?.revealed,
        ),
      );
      return Object.keys(next).length === Object.keys(current).length
        ? current
        : next;
    });
  }, [state.game?.board]);

  useEffect(() => {
    const settings = state.room?.settings;
    const legacyDuration =
      settings?.timer && settings.timer !== "none" ? Number(settings.timer) : 0;
    const baseDuration =
      state.game?.phase === "operatives"
        ? (settings?.operativeTimer ?? legacyDuration)
        : (settings?.spymasterTimer ?? legacyDuration);
    const isFirstClue =
      state.game?.phase === "spymaster" &&
      (state.game?.hintHistory?.length ?? 0) === 0;
    const duration =
      baseDuration + (isFirstClue ? (settings?.firstClueBonus ?? 0) : 0);
    if (!duration || !state.game || state.game.status !== "active") {
      setSpymasterSecondsRemaining(null);
      setOperativeSecondsRemaining(null);
      return;
    }

    const updateTimers = () => {
      const turnStartedAt =
        state.game?.phaseStartedAt ??
        state.game?.turnStartedAt ??
        state.game?.createdAt ??
        new Date();
      const elapsedSinceTurn = Math.floor(
        (Date.now() - new Date(turnStartedAt).getTime()) / 1000,
      );
      setSpymasterSecondsRemaining(duration - elapsedSinceTurn);
      setOperativeSecondsRemaining(
        state.game?.phase === "operatives" ? duration - elapsedSinceTurn : null,
      );
    };

    updateTimers();
    const interval = window.setInterval(() => {
      updateTimers();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    roomCode,
    state.game?.currentTurn,
    state.game?.turnStartedAt,
    state.game?.phaseStartedAt,
    state.game?.hintSubmittedAt,
    state.game?.status,
    state.room?.settings.timer,
    state.room?.settings.spymasterTimer,
    state.room?.settings.operativeTimer,
    state.room?.settings.firstClueBonus,
    state.game?.phase,
    state.game?.hintHistory?.length,
    state.room?.players,
    user?.telegramId,
  ]);

  const blueCardsRemaining = state.game?.blueCardsRemaining ?? 0;
  const redCardsRemaining = state.game?.redCardsRemaining ?? 0;
  const isBlueTurn = state.game?.currentTurn === "blue";
  const isRedTurn = state.game?.currentTurn === "red";
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

    function handleDisconnect() {
      setHasJoinedRoom(false);
      if (isMounted) {
        setIsReconnecting(true);
        toast.error("Disconnected. Reconnecting...");
      }
    }

    if (socket) {
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

      socket.on("connect", handleReconnect);
      socket.on("connected", handleReconnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("game:initialized", handleGameInitialized);
      socket.on("game:keycard", handleKeycardReveal);
      socket.on("game:error", handleGameError);

      return () => {
        isMounted = false;
        socket.off("connect", handleReconnect);
        socket.off("connected", handleReconnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("game:initialized", handleGameInitialized);
        socket.off("game:keycard", handleKeycardReveal);
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
  const isActiveSpymaster = isActiveRole(state.game, viewerPlayer, "spymaster");
  const isActiveOperative = isActiveRole(state.game, viewerPlayer, "operative");
  const hasActiveHint = hasActiveHintForGame(state.game);
  const canSubmitHint = canSubmitHintForViewer(state.game, viewerPlayer);
  const canSelectCard = canSelectCardForViewer(state.game, viewerPlayer);
  const activeSecondsRemaining = isActiveSpymaster
    ? spymasterSecondsRemaining
    : operativeSecondsRemaining;
  const timerExpired =
    activeSecondsRemaining !== null && activeSecondsRemaining <= 0;
  const canPassTurn = canPassTurnForViewer(
    state.game,
    viewerPlayer,
    timerExpired,
  );
  const canTakeTurn = canTakeTurnForViewer(
    state.game,
    viewerPlayer,
    timerExpired,
  );
  const { submitHint, selectCard, confirmSelection, passTurn, takeTurn } =
    useGameActions({
      socket,
      roomCode,
      telegramId: user?.telegramId,
      game: state.game,
      canSubmitHint,
      canSelectCard,
      canPassTurn,
      canTakeTurn,
      secondsRemaining: activeSecondsRemaining,
      hintSubmitting,
      setHintSubmitting,
      setHintMessage,
      setHintDraft,
      setSelectedHintCardIds,
      onGameUpdated: refreshGameState,
    });
  const currentSelectedCardIndex = state.game?.selectedCardId
    ? Number.parseInt(state.game.selectedCardId, 10)
    : null;
  const currentSelectedPlayer = state.room?.players.find(
    (player) => player.userId === state.game?.selectedByPlayerId,
  );
  const visibleSelectedPlayersByCard =
    currentSelectedCardIndex !== null && currentSelectedPlayer
      ? {
          ...selectedPlayersByCard,
          [currentSelectedCardIndex]: [
            ...(selectedPlayersByCard[currentSelectedCardIndex] ?? []).filter(
              (player) => player.userId !== currentSelectedPlayer.userId,
            ),
            currentSelectedPlayer,
          ],
        }
      : selectedPlayersByCard;
  const gameFinished = state.game?.status === "finished";
  const roomSettings = state.room?.settings;
  const legacyTimerDuration =
    roomSettings?.timer && roomSettings.timer !== "none"
      ? Number(roomSettings.timer)
      : 0;
  const timerDuration = state.game
    ? (state.game.phase === "operatives"
        ? (roomSettings?.operativeTimer ?? legacyTimerDuration)
        : (roomSettings?.spymasterTimer ?? legacyTimerDuration)) +
      (state.game.phase === "spymaster" &&
      (state.game.hintHistory?.length ?? 0) === 0
        ? (roomSettings?.firstClueBonus ?? 0)
        : 0)
    : 0;
  const timerProgress =
    timerDuration && activeSecondsRemaining !== null
      ? Math.max(
          0,
          Math.min(100, (activeSecondsRemaining / timerDuration) * 100),
        )
      : 0;
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
      <RoomSettingsPopupContent
        room={state.room}
        isRoomOwner={isRoomOwner}
        onClose={closePopup}
        onResetTeams={handleResetTeams}
        onShuffleTeams={handleShuffleTeams}
      />,
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
  const selectedCardActive = Boolean(state.game?.selectedCardId);
  const turnInstruction = gameFinished
    ? `${state.game?.winningTeam ?? "Winning"} team wins`
    : isViewerSpymaster
      ? "Give your operatives a clue"
      : isViewerOperative
        ? hasActiveHint
          ? selectedCardActive
            ? "Tap the guess button to confirm"
            : "Tap to choose a word"
          : "Wait for your spymaster to give you a clue"
        : "Watch the turn";
  const activeOperative = state.room?.players.find(
    (player) =>
      player.team === state.game?.currentTurn && player.role !== "spymaster",
  );
  const activeSpymaster = state.room?.players.find(
    (player) =>
      player.team === state.game?.currentTurn && player.role === "spymaster",
  );
  const turnPlayer = isViewerSpymaster ? activeSpymaster : activeOperative;

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

  function handleToggleHintCard(cardIndex: number) {
    if (!canSubmitHint || hintSubmitting) return;
    const selectedCard = state.game?.board[cardIndex];
    if (
      !selectedCard ||
      state.game?.role !== "spymaster" ||
      selectedCard.color !== state.game.currentTurn
    ) {
      return;
    }

    setSelectedHintCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardIndex)) next.delete(cardIndex);
      else next.add(cardIndex);
      setHintDraft((draft) => ({ ...draft, number: String(next.size) }));
      return next;
    });
  }

  function handleHintNumberChange(value: string) {
    setSelectedHintCardIds(new Set());
    setHintDraft((current) => ({ ...current, number: value }));
  }

  function handleResetGame() {
    const activeSocket = getSocketClient();
    if (!state.room || !user?.telegramId || !activeSocket) {
      setHintMessage("Unable to return the room to the lobby.");
      return;
    }

    activeSocket.emit("room:resetGame", {
      roomCode: state.room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    setHintMessage("Returning everyone to the lobby...");
    toast.success("Returning everyone to the lobby.");
  }

  function handleQuickRematch() {
    const activeSocket = getSocketClient();
    if (!state.room || !user?.telegramId || !activeSocket) {
      setHintMessage("Unable to start a quick rematch.");
      return;
    }

    activeSocket.emit("room:rematch", {
      roomCode: state.room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    setHintMessage("Starting a quick rematch...");
    toast.success("Starting a quick rematch.");
  }

  async function refreshGameState() {
    setRefreshingGame(true);
    await loadGameData();
    setRefreshingGame(false);
  }

  function handleConfirmCard(cardIndex: number) {
    if (
      !state.game ||
      !user?.telegramId ||
      state.game.selectedCardId !== String(cardIndex)
    ) {
      return;
    }

    confirmSelection();
  }

  function handleSelectCard(cardIndex: number) {
    if (!viewerPlayer || !canSelectCard) {
      return;
    }

    setSelectedPlayersByCard((current) => ({
      ...current,
      [cardIndex]: [
        ...(current[cardIndex] ?? []).filter(
          (player) => player.userId !== viewerPlayer.userId,
        ),
        viewerPlayer,
      ],
    }));
    selectCard(cardIndex);
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
      <PlayerAssignmentPopupContent
        player={player}
        isRoomCreator={isRoomCreator}
        isCreator={isCreator}
        isAdmin={isAdmin}
        onAssign={(team, role) =>
          handleAssignPlayerFromGame(player.telegramId, team, role)
        }
        onToggleAdmin={() => {
          socket?.emit("room:setAdmin", {
            roomCode: state.room?.roomCode,
            creatorTelegramId: user.telegramId,
            targetTelegramId: player.telegramId,
            isAdmin: !isAdmin,
          });
          closePopup();
        }}
      />,
      "Assign role",
    );
    openPopup();
  }

  function handleShowPlayers() {
    if (!state.room) return;

    registerPopup(
      <PlayerRosterPopupContent
        room={state.room}
        canManagePlayers={isRoomOwner}
        onPlayerClick={handleGamePlayerClick}
      />,
      "Players",
    );
    openPopup();
  }

  if (state.loading) {
    return <GameLoadingState />;
  }

  if (state.error || !state.room || !state.game) {
    return <GameErrorState error={state.error} onLeave={onLeave} />;
  }

  return (
    <PageContainer>
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-150 flex-col px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-0 text-white transition-colors duration-300 sm:px-2 ${state.game.currentTurn === "red" ? "bg-[#c92f16]" : "bg-[#0b69ad]"}`}
      >
        <GameHeaderBar
          playerCount={getPlayerCount(state.room)}
          spectatorCount={getSpectatorCount(state.room)}
          refreshingGame={refreshingGame}
          onShowPlayers={handleShowPlayers}
          onLeave={onLeave}
          onReturnToLobby={onReturnToLobby}
          onRefresh={refreshGameState}
          onSettings={openPopup}
        />
        {isReconnecting ? (
          <div className="mb-3">
            <StatusPanel
              title="Reconnecting"
              description="Syncing the latest room and board state."
              tone="info"
            />
          </div>
        ) : null}
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-1">
          <div className="col-start-1 row-span-2 flex min-h-0 flex-col gap-1">
            <TeamPanel
              team="blue"
              remainingCards={blueCardsRemaining}
              operatives={blueOperatives}
              active={isBlueTurn}
              canManagePlayers={isRoomOwner}
              onPlayerClick={handleGamePlayerClick}
            />
            <div className="flex items-center justify-center px-3 py-2 text-[2.7rem] font-black leading-none tracking-[-0.08em] text-white">
              {blueCardsRemaining}
            </div>
            <SpymasterPanel
              team="blue"
              player={blueSpymaster}
              active={isBlueTurn}
              canManagePlayers={isRoomOwner}
              onPlayerClick={handleGamePlayerClick}
            />
          </div>

          <GameLog
            className="col-start-2 row-span-2"
            entries={gameLog}
            players={state.room?.players ?? []}
            timerDuration={timerDuration}
            secondsRemaining={activeSecondsRemaining}
            timerProgress={timerProgress}
          />

          <div className="col-start-3 row-span-2 flex min-h-0 flex-col gap-1">
            <TeamPanel
              team="red"
              remainingCards={redCardsRemaining}
              operatives={redOperatives}
              active={isRedTurn}
              canManagePlayers={isRoomOwner}
              onPlayerClick={handleGamePlayerClick}
            />
            <div className="flex items-center justify-center px-3 py-2 text-[2.7rem] font-black leading-none tracking-[-0.08em] text-white">
              {redCardsRemaining}
            </div>
            <SpymasterPanel
              team="red"
              player={redSpymaster}
              active={isRedTurn}
              canManagePlayers={isRoomOwner}
              onPlayerClick={handleGamePlayerClick}
            />
          </div>
        </div>
        <TurnBanner
          instruction={turnInstruction}
          player={turnPlayer}
          onHelp={() => {
            registerPopup(
              <div className="space-y-3 text-sm text-(--app-text)">
                <p>Spymasters give one clue word and a number.</p>
                <p>
                  Operatives tap a card to select it, then use the green button
                  to confirm.
                </p>
                <p>Tap a revealed card to show or hide its word.</p>
              </div>,
              "How to play",
            );
            openPopup();
          }}
        />
        <GameBoardSurface
          game={state.game}
          viewerPlayerId={viewerPlayer?.userId}
          canSelectCard={canSelectCard}
          onSelectCard={handleSelectCard}
          onConfirmCard={handleConfirmCard}
          selectedHintCardIds={selectedHintCardIds}
          onToggleHintCard={
            state.game.role === "spymaster" ? handleToggleHintCard : undefined
          }
          hideWords={false}
          selectedPlayersByCard={visibleSelectedPlayersByCard}
        />
        {gameFinished && isRoomOwner ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickRematch}
              className="w-full rounded-full border-2 border-[#b8ff8e] bg-[#51df20] px-3 py-3 text-xs font-black uppercase tracking-[0.06em] text-[#123d08] shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Quick rematch
            </button>
            <button
              type="button"
              onClick={handleResetGame}
              className="w-full rounded-full border-2 border-white/70 bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.06em] text-[#0a63d4] shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Return to lobby
            </button>
          </div>
        ) : null}
        {canSubmitHint ? (
          <HintComposer
            word={hintDraft.word}
            number={hintDraft.number}
            submitting={hintSubmitting}
            onWordChange={(word) =>
              setHintDraft((current) => ({ ...current, word }))
            }
            onNumberChange={handleHintNumberChange}
            onSubmit={() => submitHint(hintDraft.word, hintDraft.number)}
          />
        ) : null}
        <TurnActionBar
          hintWord={state.game.currentHintWord}
          hintNumber={state.game.currentHintNumber}
          remainingGuesses={state.game.remainingGuesses}
          canPass={canPassTurn}
          canTake={canTakeTurn}
          activeOperative={isActiveOperative}
          onPass={passTurn}
          onTake={takeTurn}
        />
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
