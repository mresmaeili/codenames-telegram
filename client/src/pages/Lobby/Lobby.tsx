import { useCallback, useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/PageContainer";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Icon } from "@/components/Icon";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useHeaderPopup } from "@/context/HeaderPopupContext";
import { useSession } from "@/context/SessionContext";
import { useLobby } from "@/hooks/useLobby";
import { getSocketClient } from "@/socket/client";
import { avatarUrlForPlayer } from "@/lib/avatar";
import { PlayerAdminBadge } from "@/components/PlayerAdminBadge";
import { PlayerPresenceDot } from "@/components/PlayerPresenceDot";
import { isDevModeEnabled } from "@/lib/dev";
import { useToast } from "@/context/ToastContext";
import { LobbyAssignmentsPanel } from "./LobbyAssignmentsPanel";
import { LobbyHeaderBar } from "./LobbyHeaderBar";
import { LobbySettingsPanel } from "./LobbySettingsPanel";
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

export interface SettingsFormState {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
  gameMode: "standard" | "rush";
  timer: "none" | "30" | "60" | "90";
  spymasterTimer: number;
  operativeTimer: number;
  firstClueBonus: number;
  language: "fa" | "en" | "es" | "he";
  wordPack: "classic" | "party" | "custom";
  customWords: string[];
}

type HostControlAction = "timer" | "word-pack";

export function LobbyPage({ roomCode, onLeave, onGameStart }: LobbyPageProps) {
  const { user } = useAuthContext();
  const { session, updateSession } = useSession();
  const { room, loading, error, refreshLobby } = useLobby({ roomCode });
  const socket = useMemo(() => getSocketClient(), []);
  const { registerPopup, openPopup, closePopup } = useHeaderPopup();
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const [hostActionPending, setHostActionPending] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    team: "blue" | "red";
    role: "operative" | "spymaster";
  } | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    maxPlayers: 16,
    allowSpectators: false,
    privateRoom: false,
    gameMode: "standard",
    timer: "60",
    spymasterTimer: 180,
    operativeTimer: 120,
    firstClueBonus: 120,
    language: "fa",
    wordPack: "classic",
    customWords: [],
  });
  const [settingsPopupAction, setSettingsPopupAction] =
    useState<HostControlAction | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSettingsForm({
      ...room.settings,
      spymasterTimer: room.settings.spymasterTimer ?? 180,
      operativeTimer: room.settings.operativeTimer ?? 120,
      firstClueBonus: room.settings.firstClueBonus ?? 120,
      customWords: room.settings.customWords ?? [],
    });
  }, [room]);

  // If the room transitions to playing, notify parent to switch to game view.
  useEffect(() => {
    if (room && room.status === "playing") {
      try {
        onGameStart();
      } catch {
        // ignore
      }
    }
  }, [room, onGameStart]);

  // Clear starting state when server confirms game initialization
  useEffect(() => {
    if (starting && room && room.status === "playing") {
      setStarting(false);
    }
  }, [starting, room]);

  // Fallback: clear starting state if server doesn't respond within 12s
  useEffect(() => {
    if (!starting) return;
    const timer = window.setTimeout(() => {
      setStarting(false);
      toast.error("Starting timed out. Server did not respond.");
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [starting, toast]);

  useEffect(() => {
    const handleRoomError = (payload: { message?: unknown }) => {
      setStarting(false);
      toast.error(
        typeof payload.message === "string"
          ? payload.message
          : "The room action could not be completed.",
      );
    };

    socket.on("room:error", handleRoomError);
    return () => {
      socket.off("room:error", handleRoomError);
    };
  }, [socket, toast]);

  const currentPlayer = room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );

  // Check if room has valid ownership info
  const hasValidOwnershipInfo = Boolean(
    room &&
    Number.isInteger(room.ownerId) &&
    room.ownerId > 0 &&
    Array.isArray(room.ownerIds) &&
    room.ownerIds.length > 0,
  );

  const isOwner = Boolean(
    currentPlayer &&
    room &&
    (room.ownerId === currentPlayer.telegramId ||
      room.ownerIds.includes(currentPlayer.telegramId)),
  );
  const isRoomCreator = Boolean(
    room && user?.telegramId !== undefined && room.ownerId === user.telegramId,
  );

  function handleStartGame() {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }
    if (!isOwner) {
      toast.error("Only the room owner can start the game.");
      return;
    }

    // show transient starting UI until server initializes the game
    setStarting(true);
    activeSocket.emit("room:start", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.info("Starting room...");
  }

  function handleResetTeams() {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can reset teams.");
      return;
    }

    activeSocket.emit("room:resetTeams", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.success("Reset teams sent to the room.");
  }

  function handleRandomizeTeams() {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can randomize teams.");
      return;
    }

    activeSocket.emit("room:shuffleTeams", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.success("Randomize teams sent to the room.");
  }

  function handleToggleAdmin(targetTelegramId: number, isAdmin: boolean) {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user || !isRoomCreator) {
      toast.error("Only the room creator can manage admins.");
      return;
    }

    activeSocket.emit("room:setAdmin", {
      roomCode: room.roomCode,
      creatorTelegramId: user.telegramId,
      targetTelegramId,
      isAdmin,
    });
    closePopup();
    toast.info(isAdmin ? "Admin access granted." : "Admin access removed.");
  }

  function handleAssignPlayer(
    targetTelegramId: number,
    team: "blue" | "red" | null,
    role: "operative" | "spymaster",
  ) {
    if (!socket || !room || !user || !isOwner) {
      toast.error("Only room admins can assign players.");
      return;
    }

    socket.emit("room:assignPlayer", {
      roomCode: room.roomCode,
      actorTelegramId: user.telegramId,
      targetTelegramId,
      team,
      role,
    });
    closePopup();
  }

  function handleKickPlayer(targetTelegramId: number) {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user || !isOwner) {
      toast.error("Only room admins can remove spectators.");
      return;
    }

    activeSocket.emit("room:kickPlayer", {
      roomCode: room.roomCode,
      actorTelegramId: user.telegramId,
      targetTelegramId,
    });
    closePopup();
    toast.info("Removing spectator...");
  }

  function handlePlayerClick(player: Room["players"][number]) {
    if (!isOwner || !room || !user) {
      return;
    }

    const isAdmin = room.ownerIds.includes(player.telegramId);
    const isCreator = player.telegramId === room.ownerId;
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
                handleAssignPlayer(
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
            handleAssignPlayer(player.telegramId, null, "operative")
          }
          className="w-full rounded-full border-2 border-white px-3 py-3 text-sm font-black text-white"
        >
          Spectators
        </button>
        {!isCreator && player.team === null ? (
          <button
            type="button"
            onClick={() => handleKickPlayer(player.telegramId)}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#ff554b] px-3 py-3 text-sm font-black text-[#ff8b84]"
          >
            <Icon name="close" size={16} />
            Remove spectator
          </button>
        ) : null}
        {isRoomCreator && !isCreator ? (
          <button
            type="button"
            onClick={() => handleToggleAdmin(player.telegramId, !isAdmin)}
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

  function handleAddBot() {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    activeSocket.emit("room:addBot", {
      roomCode: room.roomCode,
    });
    toast.info("Adding bot to the room...");
  }

  function handleOpenSettingsPopup(action: HostControlAction) {
    setSettingsPopupAction(action);
    openPopup();
  }

  const handleCloseSettingsPopup = useCallback(() => {
    setSettingsPopupAction(null);
    closePopup();
  }, [closePopup]);

  const handleSettingsSave = useCallback(() => {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can save settings.");
      return;
    }

    setHostActionPending(true);
    activeSocket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: settingsForm,
    });
    handleCloseSettingsPopup();
    toast.info("Saving game settings...");
    window.setTimeout(() => setHostActionPending(false), 1200);
  }, [
    handleCloseSettingsPopup,
    isOwner,
    room,
    settingsForm,
    socket,
    toast,
    user,
  ]);

  // Compact custom word editor used inside the word-pack popup.
  function WordPackEditor() {
    const customWordsText = settingsForm.customWords.join("\n");
    const uniqueWordCount = settingsForm.customWords.length;

    return (
      <div className="space-y-4">
        {[
          { value: "classic", label: "Classic Pack" },
          { value: "party", label: "Party Pack" },
          { value: "custom", label: "Custom Word Pack" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              setSettingsForm((current) => ({
                ...current,
                wordPack: option.value as SettingsFormState["wordPack"],
              }))
            }
            className={`w-full rounded-3xl border px-4 py-3 text-left font-semibold ${
              settingsForm.wordPack === option.value
                ? "border-[#2cc86c] bg-white/10 text-white"
                : "border-white/10 bg-(--app-background) text-(--app-text)"
            }`}
          >
            {option.label}
          </button>
        ))}
        {settingsForm.wordPack === "custom" ? (
          <div className="rounded-[22px] bg-black p-2">
            <textarea
              value={customWordsText}
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  customWords: [
                    ...new Set(
                      event.target.value
                        .split(/\r?\n/)
                        .map((word) => word.trim())
                        .filter(Boolean),
                    ),
                  ],
                }))
              }
              placeholder="Enter a custom word"
              rows={9}
              className="w-full resize-y rounded-xl border border-white/30 bg-[#020817] px-3 py-3 font-mono text-base text-white outline-none placeholder:text-white/45 focus:border-white"
              aria-label="Custom words"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/65">
              <span>One word per line | Keep it short and simple</span>
              <strong className="shrink-0 text-sm text-white">
                Unique words: {uniqueWordCount}
              </strong>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  useEffect(() => {
    if (!settingsPopupAction || !room) {
      return;
    }

    const titleMap: Record<HostControlAction, string> = {
      timer: "Timer",
      "word-pack": "Word packs & language",
    };

    const title = titleMap[settingsPopupAction] ?? "Setting";

    registerPopup(
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            {title}
          </div>
        </div>

        {settingsPopupAction === "timer" ? (
          <div className="space-y-4">
            {settingsForm.timer !== "none" ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Spymaster timer", settingsForm.spymasterTimer],
                  ["Operative timer", settingsForm.operativeTimer],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] bg-black px-3 py-3 text-white"
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <input
                      type="number"
                      min="0"
                      step="30"
                      value={value}
                      onChange={(event) => {
                        const nextValue = Math.max(
                          0,
                          Number(event.target.value) || 0,
                        );
                        setSettingsForm((current) => ({
                          ...current,
                          timer: "90",
                          ...(label === "Spymaster timer"
                            ? { spymasterTimer: nextValue }
                            : { operativeTimer: nextValue }),
                        }));
                      }}
                      className="mt-2 w-full rounded-xl bg-[#d7d7d7] px-3 py-2 text-right text-lg font-bold text-[#191919]"
                      aria-label={String(label)}
                    />
                  </div>
                ))}
                <div className="col-span-2 rounded-[22px] bg-black px-3 py-3 text-white">
                  <p className="text-sm font-semibold">
                    Extra time for first clue
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="30"
                    value={settingsForm.firstClueBonus}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        timer: "90",
                        firstClueBonus: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-2 w-full rounded-xl bg-[#d7d7d7] px-3 py-2 text-right text-lg font-bold text-[#191919]"
                    aria-label="Extra time for first clue"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] bg-black px-4 py-7 text-center text-white">
                <div className="text-4xl">⏱</div>
                <p className="mt-2 text-lg font-bold">No timer</p>
              </div>
            )}
            <div className="px-1">
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={
                  settingsForm.timer === "none"
                    ? 0
                    : settingsForm.timer === "30"
                      ? 1
                      : settingsForm.timer === "60"
                        ? 2
                        : 3
                }
                onChange={(event) => {
                  const values = ["none", "30", "60", "90"] as const;
                  const presets = [
                    { spymasterTimer: 0, operativeTimer: 0, firstClueBonus: 0 },
                    {
                      spymasterTimer: 90,
                      operativeTimer: 60,
                      firstClueBonus: 60,
                    },
                    {
                      spymasterTimer: 180,
                      operativeTimer: 120,
                      firstClueBonus: 120,
                    },
                  ];
                  const index = Number(event.target.value);
                  setSettingsForm((current) => ({
                    ...current,
                    timer: values[index] ?? "90",
                    ...(presets[index] ?? {}),
                  }));
                }}
                className="h-2 w-full accent-[#2cc86c]"
                aria-label="Timer preset"
              />
              <div className="mt-2 grid grid-cols-4 text-center text-xs font-black uppercase tracking-wide text-white/75">
                <span
                  className={
                    settingsForm.timer === "none" ? "text-[#2cc86c]" : ""
                  }
                >
                  Off
                </span>
                <span
                  className={
                    settingsForm.spymasterTimer === 90 ? "text-[#2cc86c]" : ""
                  }
                >
                  Quick
                </span>
                <span
                  className={
                    settingsForm.spymasterTimer === 180 ? "text-[#2cc86c]" : ""
                  }
                >
                  Relaxed
                </span>
                <span
                  className={
                    settingsForm.timer === "90" ? "text-[#2cc86c]" : ""
                  }
                >
                  Custom
                </span>
              </div>
            </div>
          </div>
        ) : settingsPopupAction === "word-pack" ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-(--app-muted)">
                Language
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "en", label: "English" },
                  { value: "fa", label: "Farsi" },
                  { value: "es", label: "Spanish" },
                  { value: "he", label: "Hebrew" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSettingsForm((current) => ({
                        ...current,
                        language: option.value as SettingsFormState["language"],
                      }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-left font-semibold ${
                      settingsForm.language === option.value
                        ? "border-[#2cc86c] bg-white/10 text-white"
                        : "border-white/10 bg-(--app-background) text-(--app-text)"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-(--app-muted)">
                Word packs
              </p>
              <WordPackEditor />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSettingsSave}
            disabled={hostActionPending || !isOwner}
            className="flex-1 rounded-full bg-[#2cc86c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {hostActionPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>,
      title,
    );
  }, [
    registerPopup,
    settingsPopupAction,
    settingsForm,
    isOwner,
    room,
    hostActionPending,
    handleSettingsSave,
    handleCloseSettingsPopup,
  ]);

  function handleAssignmentChange(
    nextTeam: "blue" | "red",
    nextRole: "operative" | "spymaster",
  ) {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    const nextAssignment = { team: nextTeam, role: nextRole };
    if (pendingAssignment) {
      return;
    }

    const currentAssignment = currentPlayer
      ? { team: currentPlayer.team, role: currentPlayer.role }
      : null;

    if (
      currentAssignment &&
      currentAssignment.team === nextAssignment.team &&
      currentAssignment.role === nextAssignment.role
    ) {
      toast.info("You are already on this team.");
      return;
    }

    setPendingAssignment(nextAssignment);
    toast.info("Joining team...");

    updateSession({
      roomCode: room.roomCode,
      lastTeam: nextTeam,
      lastRole: nextRole,
      lastJoinedAt: new Date().toISOString(),
    });

    activeSocket.emit(
      "room:updateTeam",
      {
        roomCode: room.roomCode,
        telegramId: user.telegramId,
        team: nextTeam,
        role: nextRole,
      },
      async (ack?: { error?: string }) => {
        if (ack?.error) {
          toast.error(ack.error);
          setPendingAssignment(null);
          return;
        }

        try {
          await refreshLobby(false);
        } finally {
          setPendingAssignment(null);
        }
      },
    );
  }

  function handleJoinSpectators() {
    const activeSocket = getSocketClient();
    if (!activeSocket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!room.settings.allowSpectators) {
      toast.error("Spectators are disabled for this room.");
      return;
    }

    if (!currentPlayer || currentPlayer.team === null) {
      return;
    }

    setPendingAssignment(null);
    activeSocket.emit(
      "room:updateTeam",
      {
        roomCode: room.roomCode,
        telegramId: user.telegramId,
        team: null,
        role: "operative",
      },
      async (ack?: { error?: string }) => {
        if (ack?.error) {
          toast.error(ack.error);
          return;
        }
        await refreshLobby(false);
        toast.success("You joined the spectators.");
      },
    );
  }

  const devMode = isDevModeEnabled();
  const redPlayers =
    room?.players.filter((player) => player.team === "red") ?? [];
  const bluePlayers =
    room?.players.filter((player) => player.team === "blue") ?? [];
  const spectatorPlayers = room?.players.filter((player) => !player.team) ?? [];

  const displayBluePlayers = bluePlayers;
  const displayRedPlayers = redPlayers;
  const displaySpectatorPlayers = spectatorPlayers;

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
      <div className="lobby-page mx-auto flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-150 flex-col overflow-hidden bg-[#070b12] px-3 pb-0 pt-0 text-white">
        {room ? (
          <LobbyHeaderBar
            playerCount={room.players.length}
            roomCode={room.roomCode}
            refreshingLobby={loading}
            onCopyRoomCode={handleCopyRoomCode}
            onLeave={onLeave}
            onRefresh={() => void refreshLobby()}
          />
        ) : null}

        {starting ? (
          <div className="shrink-0 pb-2">
            <LoadingIndicator />
          </div>
        ) : null}

        <div className="lobby-content min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <LoadingSkeleton variant="lobby" />
          ) : error ? (
            <div className="mb-4">
              <StatusPanel
                title="Lobby unavailable"
                description={error}
                tone="error"
              />
            </div>
          ) : room ? (
            <>
              <div className="lobby-body min-h-0 overflow-hidden">
                <div className="lobby-room-meta mt-2 w-full shrink-0 px-2">
                  <div className="lobby-spectators rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                        Spectators
                      </div>
                    </div>
                    <div className="flex min-h-12 items-center justify-center gap-3 overflow-x-auto py-2">
                      {displaySpectatorPlayers.length > 0 ? (
                        displaySpectatorPlayers.map((p) => (
                          <div
                            key={p.userId}
                            className="relative flex flex-col items-center gap-1 rounded-full bg-white/5 px-2 py-1"
                          >
                            <button
                              type="button"
                              onClick={() => handlePlayerClick(p)}
                              disabled={!isOwner}
                              className="flex flex-col items-center gap-1"
                            >
                              <span className="relative">
                                <img
                                  src={avatarUrlForPlayer(p)}
                                  alt={p.displayName}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                                <PlayerPresenceDot
                                  player={p}
                                  className="border-white"
                                />
                                <PlayerAdminBadge
                                  isAdmin={room.ownerIds.includes(p.telegramId)}
                                />
                              </span>
                              <span className="whitespace-nowrap text-xs font-semibold text-white">
                                {p.displayName}
                              </span>
                            </button>
                            {isOwner &&
                            p.presence === "offline" &&
                            p.telegramId !== room.ownerId ? (
                              <button
                                type="button"
                                aria-label={`Remove ${p.displayName}`}
                                title="Remove offline spectator"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleKickPlayer(p.telegramId);
                                }}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff554b] text-white"
                              >
                                <Icon name="close" size={12} />
                              </button>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-white/40 italic">
                          No spectators
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <LobbySettingsPanel
                  settingsForm={settingsForm}
                  isOwner={isOwner}
                  onResetTeams={handleResetTeams}
                  onRandomizeTeams={handleRandomizeTeams}
                  onOpenTimerSettings={() => handleOpenSettingsPopup("timer")}
                  onOpenWordPackSettings={() =>
                    handleOpenSettingsPopup("word-pack")
                  }
                />

                <LobbyAssignmentsPanel
                  bluePlayers={displayBluePlayers}
                  redPlayers={displayRedPlayers}
                  ownerIds={room.ownerIds}
                  onAssignmentChange={handleAssignmentChange}
                  pendingAssignment={pendingAssignment}
                  canManagePlayers={isOwner}
                  onPlayerClick={handlePlayerClick}
                  activeTeam={currentPlayer?.team}
                  activeRole={currentPlayer?.role}
                />

                <div className="lobby-start mt-4 shrink-0">
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="lobby-start-button mt-4 w-full rounded-full border-2 border-[#a5ff55] bg-gradient-to-b from-[#54e313] to-[#25b900] px-4 py-4 text-3xl font-black uppercase tracking-tight text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.42),0_5px_0_#168900,0_12px_18px_rgba(40,200,100,0.35)]"
                  >
                    Start game
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
