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
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [wordPools, setWordPools] = useState<
    Array<{
      name: string;
      language: "fa" | "en";
      words: string[];
      isDefault: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  >([]);
  const [wordPoolName, setWordPoolName] = useState("");
  const [wordPoolLanguage, setWordPoolLanguage] = useState<"fa" | "en">("fa");
  const [wordPoolWords, setWordPoolWords] = useState("");
  const [wordPoolAdminKey, setWordPoolAdminKey] = useState("");
  const [wordPoolSaving, setWordPoolSaving] = useState(false);
  const [hostControlDraft, setHostControlDraft] = useState<{
    gameMode: "standard" | "rush";
    timer: "none" | "30" | "60" | "90";
    language: "fa" | "en" | "es" | "he";
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
    privateRoom: false,
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

  useEffect(() => {
    void fetchWordPools();
  }, []);

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

  async function handleInlineUpdate<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K],
  ) {
    if (!socket || !room || !user) {
      toast.error("Socket connection is unavailable.");
      return;
    }

    if (!isOwner) {
      toast.error("Only the room owner can change this setting.");
      return;
    }

    const nextSettings: SettingsFormState = {
      ...settingsForm,
      [field]: value,
    } as SettingsFormState;

    setSettingsForm(nextSettings);
    // optimistic UI
    setLocalRoom((current) =>
      current && room
        ? {
            ...room,
            settings: nextSettings,
          }
        : current,
    );

    socket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: nextSettings,
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

  async function handleWordPoolSave() {
    if (!room || !user) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    if (!wordPoolName.trim()) {
      setFeedback("Word pool name is required.");
      return;
    }

    if (!wordPoolWords.trim()) {
      setFeedback("Enter at least 25 words for the pool.");
      return;
    }

    if (!wordPoolAdminKey.trim()) {
      setFeedback("Admin key is required to save a word pool.");
      return;
    }

    setWordPoolSaving(true);
    try {
      const response = await fetch("/api/words/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wordPoolName,
          language: wordPoolLanguage,
          words: wordPoolWords.split(/\r?\n|,|;|\t/).map((word) => word.trim()),
          isDefault: true,
          adminKey: wordPoolAdminKey,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to save word pool.");
      }

      setWordPoolName("");
      setWordPoolWords("");
      setWordPoolAdminKey("");
      setFeedback("Word pool saved successfully.");
      toast.success("Word pool saved.");

      if (Array.isArray(payload.pool?.words)) {
        setWordPools((current) => [
          {
            name: String(payload.pool.name ?? wordPoolName),
            language: payload.pool.language === "fa" ? "fa" : "en",
            words: payload.pool.words.map(String),
            isDefault: Boolean(payload.pool.isDefault),
            createdAt: String(
              payload.pool.createdAt ?? new Date().toISOString(),
            ),
            updatedAt: String(
              payload.pool.updatedAt ?? new Date().toISOString(),
            ),
          },
          ...current.filter((pool) => pool.name !== payload.pool.name),
        ]);
      } else {
        void fetchWordPools();
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to save word pool.",
      );
      toast.error(
        error instanceof Error ? error.message : "Unable to save word pool.",
      );
    } finally {
      setWordPoolSaving(false);
    }
  }

  async function fetchWordPools() {
    try {
      const response = await fetch("/api/words/pools");
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      if (Array.isArray(payload.pools)) {
        setWordPools(
          payload.pools.map((pool: any) => ({
            name: String(pool.name ?? ""),
            language: pool.language === "fa" ? "fa" : "en",
            words: Array.isArray(pool.words) ? pool.words.map(String) : [],
            isDefault: Boolean(pool.isDefault),
            createdAt: String(pool.createdAt ?? ""),
            updatedAt: String(pool.updatedAt ?? ""),
          })),
        );
      }
    } catch {
      // ignore load errors
    }
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

    if (!["fa", "en", "es", "he"].includes(nextSettings.language)) {
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
                    language: event.target.value as "fa" | "en" | "es" | "he",
                  }))
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="fa">Farsi</option>
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

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
            Word pools
          </p>
          <div className="mt-4 space-y-4 rounded-4xl border border-(--app-border) bg-(--app-surface) p-4">
            <p className="text-sm text-(--app-muted)">
              Save a custom word pool for Farsi or English games. You must
              provide the admin key to persist a pool and set it as the default.
            </p>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Pool name
              </span>
              <input
                value={wordPoolName}
                onChange={(event) => setWordPoolName(event.target.value)}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                placeholder="e.g. Farsi default pack"
              />
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Language
              </span>
              <select
                value={wordPoolLanguage}
                onChange={(event) =>
                  setWordPoolLanguage(event.target.value === "fa" ? "fa" : "en")
                }
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
              >
                <option value="fa">Farsi</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Words
              </span>
              <textarea
                value={wordPoolWords}
                onChange={(event) => setWordPoolWords(event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                placeholder="Enter one word per line, comma-separated, or semicolon-separated"
              />
            </label>
            <label className="block rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                Admin key
              </span>
              <input
                value={wordPoolAdminKey}
                onChange={(event) => setWordPoolAdminKey(event.target.value)}
                type="password"
                className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-text)"
                placeholder="Required to save word pools"
              />
            </label>
            <button
              type="button"
              onClick={handleWordPoolSave}
              disabled={wordPoolSaving}
              className="w-full rounded-full border border-(--app-border) bg-(--app-background) px-4 py-3 text-sm font-medium text-(--app-text) disabled:opacity-60"
            >
              {wordPoolSaving ? "Saving..." : "Save word pool"}
            </button>
            {wordPools.length > 0 ? (
              <div className="space-y-3 rounded-3xl border border-(--app-border) bg-(--app-background) p-4 text-sm text-(--app-text)">
                <p className="text-xs uppercase tracking-[0.24em] text-(--app-muted)">
                  Saved pools
                </p>
                {wordPools.map((pool) => (
                  <div
                    key={`${pool.name}-${pool.language}`}
                    className="rounded-3xl border border-(--app-border) bg-(--app-surface) p-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm text-(--app-text)">
                      <span>{pool.name}</span>
                      <span className="rounded-full bg-(--app-border)/20 px-2 py-1 text-xs text-(--app-muted)">
                        {pool.language.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-(--app-muted)">
                      {pool.words.length} words •{" "}
                      {pool.isDefault ? "Default" : "Saved"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
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
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Players"
                className="flex items-center gap-2 rounded-full border border-white/70 bg-[#101720] px-3 py-2 text-white"
              >
                <span className="text-2xl">👥</span>
                <span className="text-base font-semibold">
                  {room.players.length}
                </span>
              </button>

              <div />

              <button
                type="button"
                aria-label="Room settings"
                onClick={() => openPopup()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-transparent text-3xl text-white"
              >
                ⚙
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex-1" />
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
              <button
                type="button"
                aria-label="Help"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#20c05b] text-2xl font-bold text-white"
              >
                ?
              </button>
            </div>

            <div className="mt-5 rounded-[28px] bg-[#4b4d51] p-3 shadow-[0_12px_20px_rgba(0,0,0,0.25)]">
              <h2 className="text-center text-2xl font-black uppercase tracking-tight text-white">
                Game settings
              </h2>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleAssignmentChange(
                        "blue",
                        currentPlayer?.role ?? "operative",
                      )
                    }
                    className="rounded-[18px] border border-white/20 bg-[#2d9bff] px-4 py-4 text-left text-white shadow-inner"
                  >
                    <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/80">
                      Codenames
                    </div>
                    <div className="text-3xl font-black">Classic</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">
                      4+ Players
                    </div>
                  </button>
                </div>

                <label className="flex w-full items-center justify-between rounded-[18px] border border-white/20 bg-[#d8d0bd] px-4 py-3 text-left text-black">
                  <span className="rounded-md bg-[#efe9dc] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                    Language
                  </span>
                  <select
                    value={settingsForm.language}
                    onChange={(e) =>
                      handleInlineUpdate("language", e.target.value as any)
                    }
                    disabled={!isOwner}
                    className="ml-4 appearance-none bg-transparent text-base font-semibold text-black/80"
                  >
                    <option value="fa">Farsi</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="he">Hebrew</option>
                  </select>
                </label>

                <label className="flex w-full items-center justify-between rounded-[18px] border border-white/20 bg-[#c6c9cd] px-4 py-3 text-left text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f1ec] text-lg text-black">
                      ⏱
                    </div>
                    <span className="text-xl font-black uppercase text-white">
                      Timer
                    </span>
                  </div>
                  <select
                    value={settingsForm.timer}
                    onChange={(e) =>
                      handleInlineUpdate("timer", e.target.value as any)
                    }
                    disabled={!isOwner}
                    className="ml-4 appearance-none bg-transparent text-lg font-bold text-white"
                  >
                    <option value="none">OFF</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                    <option value="90">90s</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleResetTeams}
                className="rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white"
              >
                Reset teams
              </button>
              <button
                type="button"
                onClick={handleRandomizeTeams}
                className="rounded-full border border-white/70 bg-[#0d1118] px-4 py-3 text-lg font-semibold text-white"
              >
                Randomize
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <section className="rounded-[24px] bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2">
                  {redPlayers.slice(0, 4).map((p) => (
                    <img
                      key={p.userId}
                      alt={p.displayName}
                      title={p.displayName}
                      src={
                        p.ghibliAvatarUrl ??
                        p.photoUrl ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          p.displayName,
                        )}&background=2d9bff&color=ffffff&size=32`
                      }
                      className="h-8 w-8 rounded-full border border-white/20"
                    />
                  ))}
                </div>
                <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
                  Operatives
                </p>
                <button
                  type="button"
                  onClick={() => handleAssignmentChange("blue", "operative")}
                  className="mt-3 w-full rounded-full bg-[#2cc86c] px-4 py-3 text-xl font-black uppercase text-white"
                >
                  Join team
                </button>
              </section>

              <section className="rounded-[24px] bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2">
                  {bluePlayers.slice(0, 4).map((p) => (
                    <img
                      key={p.userId}
                      alt={p.displayName}
                      title={p.displayName}
                      src={
                        p.ghibliAvatarUrl ??
                        p.photoUrl ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          p.displayName,
                        )}&background=ef5b5b&color=ffffff&size=32`
                      }
                      className="h-8 w-8 rounded-full border border-white/20"
                    />
                  ))}
                </div>
                <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
                  Operatives
                </p>
                <button
                  type="button"
                  onClick={() => handleAssignmentChange("red", "operative")}
                  className="mt-3 w-full rounded-full bg-[#2cc86c] px-4 py-3 text-xl font-black uppercase text-white"
                >
                  Join team
                </button>
              </section>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <section className="rounded-[24px] bg-[#2f7ec7] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2">
                  {redPlayers.slice(0, 4).map((p) => (
                    <img
                      key={p.userId}
                      alt={p.displayName}
                      title={p.displayName}
                      src={
                        p.ghibliAvatarUrl ??
                        p.photoUrl ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          p.displayName,
                        )}&background=2f7ec7&color=ffffff&size=32`
                      }
                      className="h-8 w-8 rounded-full border border-white/20"
                    />
                  ))}
                </div>
                <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
                  Spymasters
                </p>
                <button
                  type="button"
                  onClick={() => handleAssignmentChange("blue", "spymaster")}
                  className="mt-3 w-full rounded-full bg-[#2cc86c] px-4 py-3 text-xl font-black uppercase text-white"
                >
                  Join team
                </button>
              </section>

              <section className="rounded-[24px] bg-[#ef5b5b] p-3 text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-2">
                  {bluePlayers.slice(0, 4).map((p) => (
                    <img
                      key={p.userId}
                      alt={p.displayName}
                      title={p.displayName}
                      src={
                        p.ghibliAvatarUrl ??
                        p.photoUrl ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          p.displayName,
                        )}&background=ef5b5b&color=ffffff&size=32`
                      }
                      className="h-8 w-8 rounded-full border border-white/20"
                    />
                  ))}
                </div>
                <p className="text-center text-xl font-black uppercase tracking-tight mt-2">
                  Spymasters
                </p>
                <button
                  type="button"
                  onClick={() => handleAssignmentChange("red", "spymaster")}
                  className="mt-3 w-full rounded-full bg-[#2cc86c] px-4 py-3 text-xl font-black uppercase text-white"
                >
                  Join team
                </button>
              </section>
            </div>

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
