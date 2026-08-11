import { useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useHeaderPopup } from "@/context/HeaderPopupContext";
import { useLobby } from "@/hooks/useLobby";
import { getSocketClient } from "@/socket/client";
import { isDevModeEnabled } from "@/lib/dev";
import { useToast } from "@/context/ToastContext";
import {
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
} from "../../../../shared/src/constants/room";
import type { PlayerRole, Room, Team } from "../../../../shared/src/types/room";

type AssignmentTeam = Team | null;

function getPlayerReadinessLabel(player: Room["players"][number]): string {
  if (!player.team) {
    return "Spectator";
  }

  if (player.role === "spymaster" || player.role === "operative") {
    return "Ready";
  }

  return "Waiting";
}

function isPlayerReady(player: Room["players"][number]): boolean {
  return Boolean(player.team && player.role);
}

interface LobbyPageProps {
  roomCode: string;
  onLeave: () => void;
  onGameStart: () => void;
}

interface SettingsFormState {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
  gameMode: "standard" | "rush";
  timer: "none" | "30" | "60" | "90";
  language: "en" | "es" | "he";
  wordPack: "classic" | "party";
}

type HostControlAction =
  | "game-mode"
  | "timer"
  | "language"
  | "word-pack"
  | "shuffle"
  | "reset";

function getReadinessIssues(room: Room | null): string[] {
  if (!room) {
    return [];
  }

  const issues: string[] = [];

  const activePlayers = room.players.filter((player) => player.team !== null);
  if (activePlayers.length < ROOM_MIN_PLAYERS) {
    issues.push(`At least ${ROOM_MIN_PLAYERS} players are required.`);
  }

  if (!room.players.some((player) => player.team === "red")) {
    issues.push("At least one player must join the Red team.");
  }

  if (!room.players.some((player) => player.team === "blue")) {
    issues.push("At least one player must join the Blue team.");
  }

  const redSpymasters = room.players.filter(
    (player) => player.team === "red" && player.role === "spymaster",
  );
  const blueSpymasters = room.players.filter(
    (player) => player.team === "blue" && player.role === "spymaster",
  );

  if (redSpymasters.length !== 1) {
    issues.push("Red team must have exactly one Spymaster.");
  }

  if (blueSpymasters.length !== 1) {
    issues.push("Blue team must have exactly one Spymaster.");
  }

  room.players.forEach((player) => {
    if (!player.team && !room.settings.allowSpectators) {
      issues.push(`${player.displayName} must select a team.`);
    }
  });

  return issues;
}

export function LobbyPage({ roomCode, onLeave, onGameStart }: LobbyPageProps) {
  const { user } = useAuthContext();
  const { registerPopup, openPopup } = useHeaderPopup();
  const { room, loading, error, refreshLobby } = useLobby({ roomCode });
  const socket = useMemo(() => getSocketClient(), []);
  const [feedback, setFeedback] = useState<string | null>(null);
  const toast = useToast();
  const [activeHostAction, setActiveHostAction] =
    useState<HostControlAction | null>(null);
  const [hostActionPending, setHostActionPending] = useState(false);
  const [localRoom, setLocalRoom] = useState<Room | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [hostControlDraft, setHostControlDraft] = useState<{
    gameMode: "standard" | "rush";
    timer: "none" | "30" | "60" | "90";
    language: "en" | "es" | "he";
    wordPack: "classic" | "party";
  }>({
    gameMode: "standard",
    timer: "60",
    language: "en",
    wordPack: "classic",
  });
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    maxPlayers: ROOM_MAX_PLAYERS,
    allowSpectators: false,
    privateRoom: true,
    gameMode: "standard",
    timer: "60",
    language: "en",
    wordPack: "classic",
  });

  useEffect(() => {
    const displayRoom = localRoom ?? room;
    if (displayRoom) {
      setSettingsForm({
        maxPlayers: displayRoom.settings.maxPlayers,
        allowSpectators: displayRoom.settings.allowSpectators,
        privateRoom: displayRoom.settings.privateRoom,
        gameMode: displayRoom.settings.gameMode,
        timer: displayRoom.settings.timer,
        language: displayRoom.settings.language,
        wordPack: displayRoom.settings.wordPack,
      });
      setHostControlDraft({
        gameMode: displayRoom.settings.gameMode,
        timer: displayRoom.settings.timer,
        language: displayRoom.settings.language,
        wordPack: displayRoom.settings.wordPack,
      });
    }
  }, [room, localRoom]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    function handleRoomError(payload: { message?: unknown }) {
      if (payload && typeof payload.message === "string") {
        setFeedback(payload.message);
        toast.error(payload.message);
        setHostActionPending(false);
        setLocalRoom(null);
      }
    }

    function handleRoomStarting(room: Room) {
      if (room.status === "playing") {
        onGameStart();
      }
      // any room update from the server should clear pending host actions
      setHostActionPending(false);
      setLocalRoom(null);
      // show success when server confirms settings/room updates
      toast.success("Room updated.");
    }

    socket.on("room:error", handleRoomError);
    socket.on("room:updated", handleRoomStarting);
    return () => {
      socket.off("room:error", handleRoomError);
      socket.off("room:updated", handleRoomStarting);
    };
  }, [socket, onGameStart]);

  useEffect(() => {
    if (!socket || !room || !user || hasJoinedRoom) {
      return;
    }

    if (socket.connected) {
      socket.emit("room:join", {
        roomCode: room.roomCode,
        telegramId: user.telegramId,
        displayName: user.firstName,
      });
      setHasJoinedRoom(true);
    }
  }, [socket, room, user, hasJoinedRoom]);

  function handleLeave() {
    if (!socket || !room) {
      onLeave();
      return;
    }

    const leavingPlayer = room.players.find(
      (player) => player.telegramId === user?.telegramId,
    );

    socket.emit("room:leave", {
      roomCode: room.roomCode,
      userId: leavingPlayer?.userId ?? user?.telegramId?.toString() ?? "",
    });
    onLeave();
  }

  function handleAssignmentChange(
    nextTeam: AssignmentTeam,
    nextRole: PlayerRole,
  ) {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:updateTeam", {
      roomCode: room.roomCode,
      telegramId: user.telegramId,
      team: nextTeam,
      role: nextRole,
    });

    setFeedback(
      nextTeam
        ? `Updated assignment to ${nextTeam} • ${nextRole}.`
        : "Updated assignment to Spectator.",
    );
  }

  function handleSettingsSave() {
    if (!socket || !room || !user) {
      setFeedback("Socket connection is unavailable.");
      return;
    }
    // client-side validation
    if (!Number.isInteger(settingsForm.maxPlayers)) {
      setFeedback("Maximum players must be a whole number.");
      return;
    }

    if (
      settingsForm.maxPlayers < ROOM_MIN_PLAYERS ||
      settingsForm.maxPlayers > ROOM_MAX_PLAYERS
    ) {
      setFeedback(
        `Maximum players must be between ${ROOM_MIN_PLAYERS} and ${ROOM_MAX_PLAYERS}.`,
      );
      return;
    }

    if (
      typeof settingsForm.allowSpectators !== "boolean" ||
      typeof settingsForm.privateRoom !== "boolean"
    ) {
      setFeedback("Invalid settings values.");
      return;
    }

    setHostActionPending(true);
    // optimistic update: show the pending settings immediately in the UI
    if (room) {
      setLocalRoom({
        ...room,
        settings: {
          maxPlayers: settingsForm.maxPlayers,
          allowSpectators: settingsForm.allowSpectators,
          privateRoom: settingsForm.privateRoom,
          gameMode: settingsForm.gameMode,
          timer: settingsForm.timer,
          language: settingsForm.language,
          wordPack: settingsForm.wordPack,
        },
      });
    }
    socket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: {
        maxPlayers: settingsForm.maxPlayers,
        allowSpectators: settingsForm.allowSpectators,
        privateRoom: settingsForm.privateRoom,
        gameMode: settingsForm.gameMode,
        timer: settingsForm.timer,
        language: settingsForm.language,
        wordPack: settingsForm.wordPack,
      },
    });

    toast.info("Updating room settings...");
  }

  function handleTransferOwnership(targetTelegramId: number) {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:transferOwner", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      targetTelegramId,
    });
    toast.info("Transferring room ownership...");
  }

  function handleHostControl(action: HostControlAction) {
    if (!room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    const labelMap: Record<HostControlAction, string> = {
      "game-mode": "Game mode",
      timer: "Timer",
      language: "Language",
      "word-pack": "Word pack",
      shuffle: "Shuffle teams",
      reset: "Reset teams",
    };

    setActiveHostAction(action);
    toast.info(`${labelMap[action]} settings opened.`);
    openPopup();
  }

  function handleHostDraftApply() {
    if (!room || !user || !socket) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    setHostActionPending(true);
    const selected = activeHostAction ?? "game-mode";

    if (selected === "shuffle") {
      socket.emit("room:shuffleTeams", {
        roomCode: room.roomCode,
        ownerTelegramId: user.telegramId,
      });
      toast.success("Shuffle teams sent to the room.");
      return;
    }

    if (selected === "reset") {
      socket.emit("room:resetTeams", {
        roomCode: room.roomCode,
        ownerTelegramId: user.telegramId,
      });
      toast.success("Reset teams sent to the room.");
      return;
    }

    const nextSettings = {
      ...settingsForm,
      gameMode: hostControlDraft.gameMode,
      timer: hostControlDraft.timer,
      language: hostControlDraft.language,
      wordPack: hostControlDraft.wordPack,
    };

    // validate draft values before sending
    if (
      nextSettings.gameMode !== "standard" &&
      nextSettings.gameMode !== "rush"
    ) {
      setFeedback("Invalid game mode.");
      setHostActionPending(false);
      return;
    }

    if (!["none", "30", "60", "90"].includes(nextSettings.timer)) {
      setFeedback("Invalid timer value.");
      setHostActionPending(false);
      return;
    }

    if (!["en", "es", "he"].includes(nextSettings.language)) {
      setFeedback("Invalid language selection.");
      setHostActionPending(false);
      return;
    }

    if (!["classic", "party"].includes(nextSettings.wordPack)) {
      setFeedback("Invalid word pack selection.");
      setHostActionPending(false);
      return;
    }
    // optimistic update for settings changes
    if (room) {
      setLocalRoom({
        ...room,
        settings: nextSettings,
      });
    }

    socket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: nextSettings,
    });

    const labelMap: Record<HostControlAction, string> = {
      "game-mode": "Game mode",
      timer: "Timer",
      language: "Language",
      "word-pack": "Word pack",
      shuffle: "Shuffle teams",
      reset: "Reset teams",
    };
    toast.success(`${labelMap[selected]} settings sent to the room.`);
  }

  function handleSettingsChange<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K],
  ) {
    setSettingsForm((current) => ({ ...current, [field]: value }));
  }

  const currentPlayer = room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );
  const ownerPlayers =
    room?.players.filter((player) => room.ownerIds?.includes(player.userId)) ??
    [];
  const ownerPlayer = ownerPlayers[0] ?? null;
  const isOwner = Boolean(
    room && room.ownerIds?.includes(currentPlayer?.userId ?? ""),
  );

  useEffect(() => {
    if (!room) {
      return;
    }

    registerPopup(
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            Game settings
          </p>
          <div className="mt-4 space-y-4 rounded-4xl border border-(--app-border) bg-(--app-surface) p-4">
            <label
              className="block text-sm font-medium text-(--app-text)"
              htmlFor="maxPlayers"
            >
              Maximum players
            </label>
            <input
              id="maxPlayers"
              type="number"
              min={ROOM_MIN_PLAYERS}
              max={ROOM_MAX_PLAYERS}
              value={settingsForm.maxPlayers}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isNaN(nextValue)) {
                  return;
                }
                handleSettingsChange("maxPlayers", nextValue);
              }}
              disabled={!isOwner}
              className="mt-2 w-full rounded-2xl border border-(--app-border) bg-(--app-background) px-3 py-2 text-(--app-text)"
            />
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-(--app-border) bg-(--app-background) p-4">
              <span className="text-sm text-(--app-text)">
                Allow spectators
              </span>
              <label className="inline-flex items-center gap-2 text-sm text-(--app-muted)">
                <input
                  type="checkbox"
                  checked={settingsForm.allowSpectators}
                  disabled={!isOwner}
                  onChange={(event) =>
                    handleSettingsChange(
                      "allowSpectators",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded border border-(--app-border) bg-(--app-background) text-(--app-text)"
                />
                {settingsForm.allowSpectators ? "On" : "Off"}
              </label>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-(--app-border) bg-(--app-background) p-4">
              <span className="text-sm text-(--app-text)">Private room</span>
              <label className="inline-flex items-center gap-2 text-sm text-(--app-muted)">
                <input
                  type="checkbox"
                  checked={settingsForm.privateRoom}
                  disabled={!isOwner}
                  onChange={(event) =>
                    handleSettingsChange("privateRoom", event.target.checked)
                  }
                  className="h-4 w-4 rounded border border-(--app-border) bg-(--app-background) text-(--app-text)"
                />
                {settingsForm.privateRoom ? "Yes" : "No"}
              </label>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={handleSettingsSave}
                disabled={hostActionPending}
                className="w-full rounded-full border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60"
              >
                {hostActionPending ? "Saving..." : "Save settings"}
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            Host controls
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Game mode
              </span>
              <select
                value={hostControlDraft.gameMode}
                onChange={(event) =>
                  setHostControlDraft((current) => ({
                    ...current,
                    gameMode: event.target.value as "standard" | "rush",
                  }))
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="standard">Standard</option>
                <option value="rush">Rush</option>
              </select>
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Timer
              </span>
              <select
                value={hostControlDraft.timer}
                onChange={(event) =>
                  setHostControlDraft((current) => ({
                    ...current,
                    timer: event.target.value as "none" | "30" | "60" | "90",
                  }))
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="none">No timer</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
              </select>
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Language
              </span>
              <select
                value={hostControlDraft.language}
                onChange={(event) =>
                  setHostControlDraft((current) => ({
                    ...current,
                    language: event.target.value as "en" | "es" | "he",
                  }))
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="he">Hebrew</option>
              </select>
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Word pack
              </span>
              <select
                value={hostControlDraft.wordPack}
                onChange={(event) =>
                  setHostControlDraft((current) => ({
                    ...current,
                    wordPack: event.target.value as "classic" | "party",
                  }))
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="classic">Classic</option>
                <option value="party">Party</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleHostControl("shuffle")}
              className="w-full rounded-full border border-(--app-border) px-4 py-3 text-sm font-semibold text-(--app-text)"
            >
              Shuffle teams
            </button>
            <button
              type="button"
              onClick={() => handleHostControl("reset")}
              className="w-full rounded-full border border-(--app-border) px-4 py-3 text-sm font-semibold text-(--app-text)"
            >
              Reset teams
            </button>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={handleHostDraftApply}
              disabled={hostActionPending}
              className="mt-4 w-full rounded-full border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm font-semibold text-(--app-text) disabled:opacity-60"
            >
              {hostActionPending ? "Applying..." : "Apply host settings"}
            </button>
          ) : null}
        </div>
      </div>,
      "Room settings",
    );
  }, [
    registerPopup,
    room,
    settingsForm,
    hostControlDraft,
    isOwner,
    hostActionPending,
    activeHostAction,
  ]);

  function handleStartGame() {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:start", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.info("Starting room...");
  }

  function handleAddBot() {
    if (!socket || !room) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:addBot", {
      roomCode: room.roomCode,
    });
    toast.info("Adding bot to the room...");
  }

  const readinessIssues = getReadinessIssues(room);
  const isReady = readinessIssues.length === 0;
  const devMode = isDevModeEnabled();
  const redPlayers =
    room?.players.filter((player) => player.team === "red") ?? [];
  const bluePlayers =
    room?.players.filter((player) => player.team === "blue") ?? [];
  const spectatorPlayers = room?.players.filter((player) => !player.team) ?? [];

  const inviteUrl =
    typeof window !== "undefined" && room
      ? `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`
      : "";

  const qrCells = useMemo(() => {
    if (!inviteUrl) {
      return Array.from({ length: 49 }, () => false);
    }

    const seed = [...inviteUrl].reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    );

    return Array.from({ length: 49 }, (_, index) => {
      const parity = (seed + index * 17 + (index % 7) * 3) % 10;
      return parity % 3 !== 0;
    });
  }, [inviteUrl]);

  const handleCopyRoomCode = async () => {
    if (!room?.roomCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.roomCode);
      toast.success(`Room code ${room.roomCode} copied to clipboard.`);
    } catch {
      toast.error("Unable to copy the room code.");
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Room invite copied to clipboard.");
    } catch {
      toast.error("Unable to copy the invite URL.");
    }
  };

  const handleShareInvite = async () => {
    if (!inviteUrl || !navigator.share) {
      toast.error("Share is not available in this browser.");
      return;
    }

    try {
      await navigator.share({
        title: `Join Codenames room ${room?.roomCode}`,
        text: "Join my Codenames room.",
        url: inviteUrl,
      });
    } catch {
      toast.error("Invite share canceled or unavailable.");
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-8 pt-1">
        <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4 shadow-2xl sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted)">
                Lobby
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-(--app-text) sm:text-3xl">
                Room {room?.roomCode ?? roomCode}
              </h1>
              <p className="mt-2 text-sm text-(--app-muted)">
                Host:{" "}
                {ownerPlayers.map((player) => player.displayName).join(", ") ||
                  "Unknown"}{" "}
                · {room?.players.length ?? 0} player
                {room?.players.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-3xl border border-(--app-border) bg-(--app-background) p-3 text-sm text-(--app-text) lg:p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted)">
                  Room code
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[0.18em] text-(--app-text) lg:text-2xl lg:tracking-[0.22em]">
                  {room?.roomCode ?? roomCode}
                </p>
              </div>
              <div className="rounded-3xl border border-(--app-border) bg-(--app-background) p-3 text-sm text-(--app-text) lg:p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted)">
                  Players
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-(--app-text) lg:text-2xl">
                  {room?.players.length ?? 0}/{settingsForm.maxPlayers}
                </p>
              </div>
              <button
                type="button"
                aria-label="Copy room code"
                onClick={handleCopyRoomCode}
                className="min-h-12 rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-3 text-sm font-medium text-(--app-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) lg:px-4"
              >
                Copy code
              </button>
              <button
                type="button"
                aria-label="Share room invite"
                onClick={handleShareInvite}
                disabled={!navigator.share}
                className="min-h-12 rounded-full border border-(--app-border) bg-(--app-surface) px-3 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--app-bg) lg:px-4"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        {feedback ? (
          <StatusPanel
            title="Update"
            description={feedback}
            tone={
              feedback.toLowerCase().includes("error") ||
              feedback.toLowerCase().includes("could not") ||
              feedback.toLowerCase().includes("failed")
                ? "error"
                : "success"
            }
          />
        ) : null}

        {loading ? (
          <StatusPanel
            title="Loading lobby"
            description="We are restoring the latest room details and player list."
            tone="info"
          />
        ) : error ? (
          <StatusPanel
            title="Lobby unavailable"
            description={error}
            tone="error"
          />
        ) : room ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="flex flex-col rounded-4xl border border-(--app-border) bg-(--app-background) p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted) sm:text-xs">
                        Blue team
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-(--app-text) sm:text-2xl">
                        {bluePlayers.length} player
                        {bluePlayers.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                      {room.status === "playing" ? "Playing" : "Waiting"}
                    </span>
                  </div>

                  {currentPlayer?.team !== "blue" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleAssignmentChange(
                          "blue",
                          currentPlayer?.role ?? "operative",
                        )
                      }
                      className="mb-4 w-full rounded-full border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-700"
                    >
                      Join Blue
                    </button>
                  ) : currentPlayer?.role === "operative" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleAssignmentChange("blue", "spymaster")
                      }
                      className="mb-4 w-full rounded-full border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-700"
                    >
                      Become Spymaster
                    </button>
                  ) : null}

                  {room.settings.allowSpectators &&
                  currentPlayer?.team !== null ? (
                    <button
                      type="button"
                      onClick={() => handleAssignmentChange(null, "operative")}
                      className="mb-4 w-full rounded-full border border-blue-500 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-700"
                    >
                      Become Spectator
                    </button>
                  ) : null}

                  <div className="space-y-3">
                    {bluePlayers.map((player) => (
                      <div
                        key={player.userId}
                        className="rounded-3xl border border-(--app-border) p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-(--app-text)">
                            {player.displayName}
                          </p>
                          {room.ownerIds?.includes(player.userId) ? (
                            <span className="text-xs text-(--app-muted)">
                              Host
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-700">
                            Blue
                          </span>
                          <span className="rounded-full border border-(--app-border) px-2 py-1 text-(--app-muted)">
                            {player.role === "spymaster"
                              ? "Spymaster"
                              : "Operative"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 ${isPlayerReady(player) ? "bg-emerald-500/10 text-emerald-700" : "border border-(--app-border) text-(--app-muted)"}`}
                          >
                            {getPlayerReadinessLabel(player)}
                          </span>
                        </div>
                        {isOwner && !room.ownerIds?.includes(player.userId) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleTransferOwnership(player.telegramId)
                            }
                            className="mt-4 w-full rounded-full border border-(--app-border) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.20em] text-(--app-text)"
                          >
                            Promote to host
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex flex-col rounded-4xl border border-(--app-border) bg-(--app-background) p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted) sm:text-xs">
                        Red team
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-(--app-text) sm:text-2xl">
                        {redPlayers.length} player
                        {redPlayers.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-700">
                      {room.status === "playing" ? "Playing" : "Waiting"}
                    </span>
                  </div>

                  {currentPlayer?.team !== "red" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleAssignmentChange(
                          "red",
                          currentPlayer?.role ?? "operative",
                        )
                      }
                      className="mb-4 w-full rounded-full border border-red-500 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
                    >
                      Join Red
                    </button>
                  ) : currentPlayer?.role === "operative" ? (
                    <button
                      type="button"
                      onClick={() => handleAssignmentChange("red", "spymaster")}
                      className="mb-4 w-full rounded-full border border-red-500 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
                    >
                      Become Spymaster
                    </button>
                  ) : null}

                  {room.settings.allowSpectators &&
                  currentPlayer?.team !== null ? (
                    <button
                      type="button"
                      onClick={() => handleAssignmentChange(null, "operative")}
                      className="mb-4 w-full rounded-full border border-red-500 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
                    >
                      Become Spectator
                    </button>
                  ) : null}

                  <div className="space-y-3">
                    {redPlayers.map((player) => (
                      <div
                        key={player.userId}
                        className="rounded-3xl border border-(--app-border) p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-(--app-text)">
                            {player.displayName}
                          </p>
                          {room.ownerIds?.includes(player.userId) ? (
                            <span className="text-xs text-(--app-muted)">
                              Host
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-700">
                            Red
                          </span>
                          <span className="rounded-full border border-(--app-border) px-2 py-1 text-(--app-muted)">
                            {player.role === "spymaster"
                              ? "Spymaster"
                              : "Operative"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 ${isPlayerReady(player) ? "bg-emerald-500/10 text-emerald-700" : "border border-(--app-border) text-(--app-muted)"}`}
                          >
                            {getPlayerReadinessLabel(player)}
                          </span>
                        </div>
                        {isOwner && !room.ownerIds?.includes(player.userId) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleTransferOwnership(player.telegramId)
                            }
                            className="mt-4 w-full rounded-full border border-(--app-border) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.20em] text-(--app-text)"
                          >
                            Promote to host
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted) sm:text-xs">
                    Room overview
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-(--app-text) sm:text-2xl">
                    Ready to start
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                          Invite link
                        </span>
                        <span className="text-xs text-(--app-muted)">
                          {room.players.length}/{settingsForm.maxPlayers}
                        </span>
                      </div>
                      <p className="rounded-2xl border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm text-(--app-text) break-all">
                        {inviteUrl}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleCopyRoomCode}
                          className="rounded-full border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm font-medium text-(--app-text)"
                        >
                          Copy code
                        </button>
                        <button
                          type="button"
                          onClick={handleShareInvite}
                          disabled={!navigator.share}
                          className="rounded-full border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                      Readiness
                    </span>
                    <span className="rounded-full bg-(--app-border)/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-(--app-text)">
                      {isReady ? "Ready" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-(--app-text)">
                    {isReady
                      ? "All required team assignments are complete."
                      : "Adjust teams, spymasters, or spectator settings before starting."}
                  </p>
                  {readinessIssues.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--app-muted)">
                      {readinessIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {devMode ? (
                    <button
                      type="button"
                      onClick={handleAddBot}
                      disabled={
                        room.players.length >= ROOM_MAX_PLAYERS ||
                        room.status !== "waiting"
                      }
                      className="rounded-full border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60"
                    >
                      Add Bot
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={!isOwner || !isReady || room.status !== "waiting"}
                    aria-label="Start game"
                    className="rounded-full bg-(--app-accent) px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  >
                    Start Game
                  </button>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                    Spectators
                  </p>
                  {spectatorPlayers.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-(--app-border) bg-(--app-background) px-4 py-4 text-sm text-(--app-muted)">
                      No spectators yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {spectatorPlayers.map((player) => (
                        <div
                          key={player.userId}
                          className="rounded-3xl border border-(--app-border) p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-(--app-text)">
                              {player.displayName}
                            </p>
                            {room.ownerIds?.includes(player.userId) ? (
                              <span className="text-xs text-(--app-muted)">
                                Host
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-(--app-border) px-2 py-1 text-(--app-muted)">
                              {player.role === "spymaster"
                                ? "Spymaster"
                                : "Operative"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 ${isPlayerReady(player) ? "bg-emerald-500/10 text-emerald-700" : "border border-(--app-border) text-(--app-muted)"}`}
                            >
                              {getPlayerReadinessLabel(player)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-4xl border border-(--app-border) bg-(--app-background) p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-(--app-muted) sm:text-xs">
                    Game settings
                  </p>
                  <p className="mt-2 text-sm text-(--app-muted)">
                    Update the room settings before the match begins.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
                    <label
                      className="text-sm font-medium text-(--app-text)"
                      htmlFor="maxPlayers"
                    >
                      Maximum players
                    </label>
                    <input
                      id="maxPlayers"
                      type="number"
                      min={ROOM_MIN_PLAYERS}
                      max={ROOM_MAX_PLAYERS}
                      value={settingsForm.maxPlayers}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (Number.isNaN(nextValue)) return;
                        handleSettingsChange("maxPlayers", nextValue);
                      }}
                      disabled={!isOwner}
                      className="mt-3 w-full rounded-2xl border border-(--app-border) bg-(--app-background) px-3 py-2 text-(--app-text)"
                    />
                  </div>

                  <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-(--app-text)">
                        Allow spectators
                      </p>
                      <label className="inline-flex items-center gap-2 text-sm text-(--app-muted)">
                        <input
                          type="checkbox"
                          checked={settingsForm.allowSpectators}
                          disabled={!isOwner}
                          onChange={(event) =>
                            handleSettingsChange(
                              "allowSpectators",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded border border-(--app-border) bg-(--app-background) text-(--app-text)"
                        />
                        {settingsForm.allowSpectators ? "On" : "Off"}
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-(--app-text)">
                        Private room
                      </p>
                      <label className="inline-flex items-center gap-2 text-sm text-(--app-muted)">
                        <input
                          type="checkbox"
                          checked={settingsForm.privateRoom}
                          disabled={!isOwner}
                          onChange={(event) =>
                            handleSettingsChange(
                              "privateRoom",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded border border-(--app-border) bg-(--app-background) text-(--app-text)"
                        />
                        {settingsForm.privateRoom ? "Yes" : "No"}
                      </label>
                    </div>
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleSettingsSave}
                      disabled={hostActionPending}
                      className="w-full rounded-full border border-(--app-border) px-4 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60"
                    >
                      {hostActionPending ? "Saving..." : "Save settings"}
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-4xl border border-(--app-border) bg-(--app-background) p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                      Host controls
                    </p>
                    <p className="mt-2 text-sm text-(--app-muted)">
                      Only the room owner can adjust these settings.
                    </p>
                  </div>
                  <span className="rounded-full bg-(--app-border)/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-(--app-text)">
                    Host
                  </span>
                </div>

                {isOwner ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handleHostControl("game-mode")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Game mode
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostControl("timer")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Timer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostControl("language")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Language
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostControl("word-pack")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Word packs
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostControl("shuffle")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Shuffle teams
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHostControl("reset")}
                        className="min-h-12 rounded-2xl border border-(--app-border) px-3 py-3 text-sm font-medium text-(--app-text)"
                      >
                        Reset teams
                      </button>
                    </div>

                    {activeHostAction === "timer" ? (
                      <label className="block text-xs text-(--app-muted)">
                        <span className="mb-1 block">Timer</span>
                        <select
                          value={hostControlDraft.timer}
                          onChange={(event) =>
                            setHostControlDraft((current) => ({
                              ...current,
                              timer: event.target.value as
                                | "none"
                                | "30"
                                | "60"
                                | "90",
                            }))
                          }
                          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                        >
                          <option value="none">No timer</option>
                          <option value="30">30 seconds</option>
                          <option value="60">60 seconds</option>
                          <option value="90">90 seconds</option>
                        </select>
                      </label>
                    ) : null}
                    {activeHostAction === "language" ? (
                      <label className="block text-xs text-(--app-muted)">
                        <span className="mb-1 block">Language</span>
                        <select
                          value={hostControlDraft.language}
                          onChange={(event) =>
                            setHostControlDraft((current) => ({
                              ...current,
                              language: event.target.value as
                                | "en"
                                | "es"
                                | "he",
                            }))
                          }
                          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="he">Hebrew</option>
                        </select>
                      </label>
                    ) : null}
                    {activeHostAction === "word-pack" ? (
                      <label className="block text-xs text-(--app-muted)">
                        <span className="mb-1 block">Word pack</span>
                        <select
                          value={hostControlDraft.wordPack}
                          onChange={(event) =>
                            setHostControlDraft((current) => ({
                              ...current,
                              wordPack: event.target.value as
                                | "classic"
                                | "party",
                            }))
                          }
                          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                        >
                          <option value="classic">Classic</option>
                          <option value="party">Party</option>
                        </select>
                      </label>
                    ) : null}
                    {activeHostAction === "shuffle" ||
                    activeHostAction === "reset" ? (
                      <p className="text-sm text-(--app-muted)">
                        {activeHostAction === "shuffle"
                          ? "Shuffle teams will balance players and refresh the room assignment view."
                          : "Reset teams returns the current lobby to standard team placements."}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleHostDraftApply}
                      disabled={hostActionPending}
                      className="w-full rounded-full border border-(--app-border) px-4 py-3 text-sm font-semibold uppercase tracking-[0.20em] text-(--app-text) disabled:opacity-60"
                    >
                      {hostActionPending ? "Applying..." : "Apply host setting"}
                    </button>
                  </>
                ) : (
                  <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-4 text-sm text-(--app-muted)">
                    Waiting for the host to adjust room settings and launch the
                    game.
                  </div>
                )}
              </section>
            </div>

            {devMode ? (
              <div className="rounded-4xl border border-(--app-border) bg-(--app-surface) p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                      Dev inspector
                    </p>
                    <p className="mt-1 text-sm text-(--app-muted)">
                      Raw room JSON and manual refresh for troubleshooting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshLobby}
                    className="rounded-full border border-(--app-border) px-4 py-2 text-sm font-medium text-(--app-text)"
                  >
                    Refresh lobby
                  </button>
                </div>
                <pre className="mt-4 max-h-72 overflow-auto rounded-3xl border border-(--app-border) bg-(--app-background) p-3 text-xs text-(--app-text)">
                  {JSON.stringify(room, null, 2)}
                </pre>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
