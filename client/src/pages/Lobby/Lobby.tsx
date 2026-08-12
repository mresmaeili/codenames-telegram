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
  const { room, loading, error, refreshLobby } = useLobby({ roomCode });
  const socket = useMemo(() => getSocketClient(), []);
  const { registerPopup, openPopup, closePopup } = useHeaderPopup();
  const [feedback, setFeedback] = useState<string | null>(null);
  const toast = useToast();
  const [hostActionPending, setHostActionPending] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
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

  const currentPlayer = room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );

  const ownerPlayer = room?.players.find(
    (player) =>
      player.userId === room.ownerId || room.ownerIds?.includes(player.userId),
  );

  const isOwner = Boolean(
    currentPlayer &&
    (room?.ownerId === currentPlayer.userId ||
      room?.ownerIds?.includes(currentPlayer.userId)),
  );

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
      setFeedback("Socket connection is unavailable.");
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

  useEffect(() => {
    if (!settingsPopupAction || !room) {
      return;
    }

    const titleMap: Record<HostControlAction, string> = {
      "game-mode": "Game mode",
      timer: "Timer",
      language: "Language",
      "word-pack": "Word pack",
      shuffle: "Shuffle teams",
      reset: "Reset teams",
    };

    const title = titleMap[settingsPopupAction] ?? "Setting";

    registerPopup(
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            {title}
          </div>
        </div>

        {!isOwner ? (
          <div className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-3 text-sm text-(--app-muted)">
            Only the room owner can change settings.
          </div>
        ) : null}

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
          <div className="space-y-3">
            {[
              { value: "classic", label: "Classic" },
              { value: "party", label: "Party" },
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
        ) : null}

        {/* actions removed — settings are applied immediately on option click; use header Close to dismiss */}
      </div>,
      title,
    );
  }, [
    registerPopup,
    settingsPopupAction,
    settingsForm,
    isOwner,
    room,
    handleSettingsSave,
    handleCloseSettingsPopup,
  ]);

  function handleAssignmentChange(
    nextTeam: "blue" | "red",
    nextRole: "operative" | "spymaster",
  ) {
    if (!socket || !room || !user) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:updateTeam", {
      roomCode: room.roomCode,
      telegramId: user.telegramId,
      team: nextTeam,
      role: nextRole,
    });
    toast.info(`Joining ${nextTeam} as ${nextRole}...`);
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
      <div className="mx-auto w-full max-w-[480px] bg-[#070b12] px-3 pb-0 pt-0 text-white">
        {feedback ? (
          <div className="mb-4">
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

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                    Room code
                  </p>
                  <div className="text-xl font-black tracking-tight">
                    {room.roomCode}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Copy code
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Copy invite
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe7ef] text-xl text-black">
                  👤
                </div>
                <span className="text-base font-semibold text-white">
                  {user?.firstName ?? ownerPlayer?.displayName ?? "Player"}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user?.telegramId) return;
                    setAvatarGenerating(true);
                    try {
                      const resp = await fetch("/api/avatars/ghibli", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ telegramId: user.telegramId }),
                      });
                      if (!resp.ok) {
                        toast.error("Avatar generation request failed.");
                      } else {
                        toast.info(
                          "Avatar generation requested. Refreshing lobby...",
                        );
                        refreshLobby();
                      }
                    } catch (e) {
                      toast.error("Avatar generation failed.");
                    } finally {
                      setAvatarGenerating(false);
                    }
                  }}
                  className="ml-2 inline-flex items-center gap-2 rounded-full bg-[#101720] px-3 py-1 text-sm text-white"
                  disabled={avatarGenerating}
                >
                  {avatarGenerating ? "Generating..." : "Refresh avatar"}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[28px] bg-[#4b4d51] p-4 shadow-[0_12px_20px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  Game settings
                </h2>
              </div>

              <LobbySettingsPanel
                settingsForm={settingsForm}
                isOwner={isOwner}
                hostActionPending={hostActionPending}
                onResetTeams={handleResetTeams}
                onRandomizeTeams={handleRandomizeTeams}
                onSaveSettings={handleSettingsSave}
                onOpenLanguageSettings={() =>
                  handleOpenSettingsPopup("language")
                }
                onOpenTimerSettings={() => handleOpenSettingsPopup("timer")}
                onOpenWordPackSettings={() =>
                  handleOpenSettingsPopup("word-pack")
                }
              />
            </div>

            <LobbyAssignmentsPanel
              bluePlayers={bluePlayers}
              redPlayers={redPlayers}
              onAssignmentChange={handleAssignmentChange}
            />

            <button
              type="button"
              onClick={handleStartGame}
              disabled={!isOwner || !isReady || room.status !== "waiting"}
              className="mt-5 w-full rounded-full bg-[#2cc86c] px-4 py-4 text-3xl font-black uppercase tracking-tight text-white shadow-[0_12px_18px_rgba(40,200,100,0.35)] disabled:opacity-60"
            >
              Start game
            </button>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
