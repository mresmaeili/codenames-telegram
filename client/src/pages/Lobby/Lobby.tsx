import { useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useHeaderPopup } from "@/context/HeaderPopupContext";
import { useLobby } from "@/hooks/useLobby";
import { getSocketClient } from "@/socket/client";
import { avatarUrlForPlayer, avatarEmojiForPlayer } from "@/lib/avatar";
import { isDevModeEnabled } from "@/lib/dev";
import { useToast } from "@/context/ToastContext";
import { LobbyAssignmentsPanel } from "./LobbyAssignmentsPanel";
import { LobbySettingsPanel } from "./LobbySettingsPanel";
import { ROOM_MIN_PLAYERS } from "../../../../shared/src/constants/room";
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
  language: "fa" | "en" | "es" | "he";
  wordPack: "classic" | "party";
}

type HostControlAction = "game-mode" | "timer" | "language" | "word-pack";

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
  const { room, loading, error } = useLobby({ roomCode });
  const socket = useMemo(() => getSocketClient(), []);
  const { registerPopup, openPopup, closePopup } = useHeaderPopup();
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const [hostActionPending, setHostActionPending] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    maxPlayers: 16,
    allowSpectators: false,
    privateRoom: false,
    gameMode: "standard",
    timer: "60",
    language: "en",
    wordPack: "classic",
  });
  const [settingsPopupAction, setSettingsPopupAction] =
    useState<HostControlAction | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSettingsForm(room.settings);
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

  const ownerPlayer = room?.players.find(
    (player) =>
      hasValidOwnershipInfo &&
      (player.telegramId === room.ownerId ||
        room.ownerIds?.includes(player.telegramId)),
  );

  const isOwner = Boolean(
    hasValidOwnershipInfo &&
    currentPlayer &&
    ownerPlayer &&
    currentPlayer.telegramId === ownerPlayer.telegramId,
  );

  function handleStartGame() {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }
    if (!isOwner) {
      toast.error("Only the room owner can start the game.");
      return;
    }

    if (!canStart) {
      // show specific readiness issues to guide the owner
      if (readinessIssues.length > 0) {
        toast.error(`Cannot start: ${readinessIssues.join("; ")}`);
      } else {
        toast.error("Cannot start the game. Please check room setup.");
      }
      return;
    }

    // show transient starting UI until server initializes the game
    setStarting(true);
    socket.emit("room:start", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.info("Starting room...");
  }

  function handleResetTeams() {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can reset teams.");
      return;
    }

    socket.emit("room:resetTeams", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.success("Reset teams sent to the room.");
  }

  function handleRandomizeTeams() {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can randomize teams.");
      return;
    }

    socket.emit("room:shuffleTeams", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });
    toast.success("Randomize teams sent to the room.");
  }

  function handleAddBot() {
    if (!socket || !room) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:addBot", {
      roomCode: room.roomCode,
    });
    toast.info("Adding bot to the room...");
  }

  function handleOpenSettingsPopup(action: HostControlAction) {
    setSettingsPopupAction(action);
    openPopup();
  }

  function handleCloseSettingsPopup() {
    setSettingsPopupAction(null);
    closePopup();
  }

  function handleSettingsSave() {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can save settings.");
      return;
    }

    setHostActionPending(true);
    socket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: settingsForm,
    });
    toast.info("Saving game settings...");
    window.setTimeout(() => setHostActionPending(false), 1200);
  }

  // Small editor used inside the word-pack popup — select pack type.
  function WordPackEditor() {
    return (
      <div className="space-y-3">
        {[
          { value: "classic", label: "Classic Pack" },
          { value: "party", label: "Party Pack" },
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
      </div>
    );
  }

  useEffect(() => {
    if (!settingsPopupAction || !room) {
      return;
    }

    const titleMap: Record<HostControlAction, string> = {
      "game-mode": "Game mode",
      timer: "Timer",
      language: "Language",
      "word-pack": "Word pack",
    };

    const title = titleMap[settingsPopupAction] ?? "Setting";

    registerPopup(
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            {title}
          </div>
        </div>

        {settingsPopupAction === "language" ? (
          <div className="space-y-3">
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
                className={`w-full rounded-3xl border px-4 py-3 text-left font-semibold ${
                  settingsForm.language === option.value
                    ? "border-[#2cc86c] bg-white/10 text-white"
                    : "border-white/10 bg-(--app-background) text-(--app-text)"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : settingsPopupAction === "timer" ? (
          <div className="space-y-3">
            {[
              { value: "none", label: "OFF" },
              { value: "30", label: "30s" },
              { value: "60", label: "60s" },
              { value: "90", label: "90s" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSettingsForm((current) => ({
                    ...current,
                    timer: option.value as SettingsFormState["timer"],
                  }))
                }
                className={`w-full rounded-3xl border px-4 py-3 text-left font-semibold ${
                  settingsForm.timer === option.value
                    ? "border-[#2cc86c] bg-white/10 text-white"
                    : "border-white/10 bg-(--app-background) text-(--app-text)"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : settingsPopupAction === "word-pack" ? (
          <WordPackEditor />
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
    toast.info("Joining team...");
  }

  const readinessIssues = getReadinessIssues(room);
  const isReady = readinessIssues.length === 0;
  // Allow starting when both teams have a spymaster and minimum players,
  // even if there are no operatives. This supports the "two spymasters, no
  // operatives" flow where the next screen will proceed.
  const activePlayers =
    room?.players.filter((player) => player.team !== null) ?? [];
  const redSpymasters =
    room?.players.filter(
      (player) => player.team === "red" && player.role === "spymaster",
    ) ?? [];
  const blueSpymasters =
    room?.players.filter(
      (player) => player.team === "blue" && player.role === "spymaster",
    ) ?? [];

  const canStart =
    isReady ||
    (redSpymasters.length === 1 &&
      blueSpymasters.length === 1 &&
      activePlayers.length >= ROOM_MIN_PLAYERS);
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
      <div className="mx-auto w-full max-w-120 bg-[#070b12] px-3 pb-0 pt-0 text-white">
        {starting ? (
          <div className="mb-4">
            <StatusPanel
              title="Starting"
              description="Initializing game..."
              tone="info"
            />
          </div>
        ) : null}

        {loading ? (
          <div className="mb-4">
            <StatusPanel
              title="Loading lobby"
              description="We are restoring the latest room details and player list."
              tone="info"
            />
          </div>
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
            {/* Header gear removed — settings open via in-page '⚙ Settings' button below */}

            <div className="mt-2 w-full px-2">
              <div className="w-full bg-[#0b0f13] rounded-lg px-3 py-2 flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 mb-0">
                    Room code
                  </p>
                  <div className="text-xl font-black tracking-tight">
                    {room.roomCode}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm font-semibold text-white"
                  >
                    Copy code
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60 text-center mb-2">
                  Spectators
                </div>
                <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 min-h-12">
                  {displaySpectatorPlayers.length > 0 ? (
                    displaySpectatorPlayers.map((p) => (
                      <div
                        key={p.userId}
                        className="flex flex-col items-center gap-1 rounded-full bg-white/5 px-2 py-1"
                      >
                        <img
                          src={avatarUrlForPlayer(p)}
                          alt={p.displayName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <span className="whitespace-nowrap text-xs font-semibold text-white">
                          {p.displayName}
                        </span>
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
              hostActionPending={hostActionPending}
              onResetTeams={handleResetTeams}
              onRandomizeTeams={handleRandomizeTeams}
              onSaveSettings={handleSettingsSave}
              onOpenLanguageSettings={() => handleOpenSettingsPopup("language")}
              onOpenTimerSettings={() => handleOpenSettingsPopup("timer")}
              onOpenWordPackSettings={() =>
                handleOpenSettingsPopup("word-pack")
              }
            />

            <div className="my-4 flex gap-3">
              <button
                type="button"
                onClick={handleResetTeams}
                disabled={!isOwner}
                className={`flex-1 rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white ${
                  isOwner
                    ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                Reset teams
              </button>
              <button
                type="button"
                onClick={handleRandomizeTeams}
                disabled={!isOwner}
                className={`flex-1 rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white ${
                  isOwner
                    ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                Shuffle teams
              </button>
            </div>

            <LobbyAssignmentsPanel
              bluePlayers={displayBluePlayers}
              redPlayers={displayRedPlayers}
              onAssignmentChange={handleAssignmentChange}
            />

            <div className="mt-4">
              <button
                type="button"
                onClick={handleStartGame}
                className="mt-4 w-full rounded-full bg-[#2cc86c] px-4 py-4 text-3xl font-black uppercase tracking-tight text-white shadow-[0_12px_18px_rgba(40,200,100,0.35)]"
              >
                Start game
              </button>
            </div>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
