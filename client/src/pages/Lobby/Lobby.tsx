import { useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useLobby } from "@/hooks/useLobby";
import { getSocketClient } from "@/socket/client";
import {
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
} from "../../../../shared/src/constants/room";
import type { PlayerRole, Room, Team } from "../../../../shared/src/types/room";

interface LobbyPageProps {
  roomCode: string;
  onLeave: () => void;
}

interface SettingsFormState {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
}

function getReadinessIssues(room: Room | null): string[] {
  if (!room) {
    return [];
  }

  const issues: string[] = [];

  if (room.players.length < ROOM_MIN_PLAYERS) {
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
    if (!player.team) {
      issues.push(`${player.displayName} must select a team.`);
    }
  });

  return issues;
}

export function LobbyPage({ roomCode, onLeave }: LobbyPageProps) {
  const { user } = useAuthContext();
  const { room, loading, error } = useLobby({ roomCode });
  const socket = useMemo(() => getSocketClient(), []);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    maxPlayers: ROOM_MAX_PLAYERS,
    allowSpectators: false,
    privateRoom: true,
  });

  useEffect(() => {
    if (room) {
      setSettingsForm({
        maxPlayers: room.settings.maxPlayers,
        allowSpectators: room.settings.allowSpectators,
        privateRoom: room.settings.privateRoom,
      });
    }
  }, [room]);

  function handleLeave() {
    if (!socket || !room) {
      onLeave();
      return;
    }

    socket.emit("room:leave", {
      roomCode: room.roomCode,
      userId: user?.telegramId?.toString() ?? "",
    });
    onLeave();
  }

  function handleAssignmentChange(nextTeam: Team, nextRole: PlayerRole) {
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

    setFeedback(`Updated assignment to ${nextTeam} • ${nextRole}.`);
  }

  function handleSettingsSave() {
    if (!socket || !room || !user) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:updateSettings", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
      settings: settingsForm,
    });

    setFeedback("Updating room settings...");
  }

  function handleStartGame() {
    if (!socket || !room || !user) {
      setFeedback("Socket connection is unavailable.");
      return;
    }

    socket.emit("room:start", {
      roomCode: room.roomCode,
      ownerTelegramId: user.telegramId,
    });

    setFeedback("Starting room...");
  }

  const currentPlayer = room?.players.find(
    (player) => player.telegramId === user?.telegramId,
  );
  const ownerPlayer = room?.players.find(
    (player) => player.userId === room.ownerId,
  );
  const isOwner = Boolean(room && currentPlayer?.userId === room.ownerId);
  const readinessIssues = getReadinessIssues(room);
  const isReady = readinessIssues.length === 0;

  return (
    <PageContainer>
      <div className="w-full max-w-3xl space-y-6 rounded-3xl border border-(--app-border) bg-(--app-surface) p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
              Lobby
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-(--app-text)">
              Room {room?.roomCode ?? roomCode}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-full border border-(--app-border) px-4 py-2 text-sm font-medium text-(--app-text)"
          >
            Leave room
          </button>
        </div>

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
            <div className="rounded-2xl border border-(--app-border) bg-(--app-background) p-4">
              <p className="text-sm text-(--app-muted)">Owner</p>
              <p className="mt-1 font-medium text-(--app-text)">
                {ownerPlayer?.displayName ?? "Room owner"}
              </p>
              <p className="mt-2 text-sm text-(--app-muted)">
                {room.players.length} player
                {room.players.length === 1 ? "" : "s"} in the room.
              </p>
            </div>

            <div className="rounded-2xl border border-(--app-border) p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                    Room settings
                  </p>
                  <p className="mt-1 text-sm text-(--app-muted)">
                    {isOwner
                      ? "You can update the room settings."
                      : "Only the room owner can edit settings."}
                  </p>
                </div>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={handleSettingsSave}
                    className="rounded-full border border-(--app-border) px-3 py-2 text-sm font-medium text-(--app-text)"
                  >
                    Save settings
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-(--app-muted)">
                  <span className="font-medium text-(--app-text)">
                    Maximum players
                  </span>
                  <input
                    type="number"
                    min={ROOM_MIN_PLAYERS}
                    max={ROOM_MAX_PLAYERS}
                    value={settingsForm.maxPlayers}
                    disabled={!isOwner}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        maxPlayers: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-(--app-border) bg-(--app-background) px-3 py-2 text-(--app-text)"
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-(--app-border) px-3 py-3 text-sm text-(--app-muted)">
                  <span className="font-medium text-(--app-text)">
                    Allow spectators
                  </span>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowSpectators}
                    disabled={!isOwner}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        allowSpectators: event.target.checked,
                      }))
                    }
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-(--app-border) px-3 py-3 text-sm text-(--app-muted)">
                  <span className="font-medium text-(--app-text)">
                    Private room
                  </span>
                  <input
                    type="checkbox"
                    checked={settingsForm.privateRoom}
                    disabled={!isOwner}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        privateRoom: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            {feedback ? (
              <StatusPanel
                title="Lobby update"
                description={feedback}
                tone={
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("unavailable")
                    ? "error"
                    : "info"
                }
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-(--app-border) p-4">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                  Team
                </p>
                <div className="mt-3 flex gap-2">
                  {(["red", "blue"] as Team[]).map((team) => {
                    const isSelected = currentPlayer?.team === team;

                    return (
                      <button
                        key={team}
                        type="button"
                        onClick={() =>
                          handleAssignmentChange(
                            team,
                            currentPlayer?.role ?? "operative",
                          )
                        }
                        className={`rounded-full px-3 py-2 text-sm font-medium ${
                          isSelected
                            ? team === "red"
                              ? "bg-red-500 text-white"
                              : "bg-blue-500 text-white"
                            : "border border-(--app-border) text-(--app-text)"
                        }`}
                      >
                        {team === "red" ? "Red" : "Blue"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-(--app-border) p-4">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                  Role
                </p>
                <div className="mt-3 flex gap-2">
                  {(["operative", "spymaster"] as PlayerRole[]).map((role) => {
                    const isSelected = currentPlayer?.role === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          handleAssignmentChange(
                            currentPlayer?.team ?? "red",
                            role,
                          )
                        }
                        className={`rounded-full px-3 py-2 text-sm font-medium ${
                          isSelected
                            ? "bg-(--app-accent) text-(--app-text)"
                            : "border border-(--app-border) text-(--app-text)"
                        }`}
                      >
                        {role === "spymaster" ? "Spymaster" : "Operative"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-(--app-border) p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-(--app-muted)">
                    Start game
                  </p>
                  <p className="mt-1 text-sm text-(--app-muted)">
                    Only the owner can start the room.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={!isOwner || !isReady || room.status !== "waiting"}
                  className="rounded-full bg-(--app-accent) px-4 py-2 text-sm font-medium text-(--app-text) disabled:opacity-60"
                >
                  Start Game
                </button>
              </div>

              {readinessIssues.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--app-muted)">
                  {readinessIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-(--app-muted)">
                  The room is ready to start.
                </p>
              )}
            </div>

            {feedback ? (
              <StatusPanel
                title="Lobby update"
                description={feedback}
                tone={
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("unavailable")
                    ? "error"
                    : "info"
                }
              />
            ) : null}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-(--app-text)">
                Players
              </h2>
              <ul className="space-y-2">
                {room.players.map((player) => (
                  <li
                    key={player.userId}
                    className="flex items-center justify-between rounded-2xl border border-(--app-border) px-4 py-3"
                  >
                    <div>
                      <span className="font-medium text-(--app-text)">
                        {player.displayName}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 ${
                            player.team === "red"
                              ? "bg-red-500/10 text-red-600"
                              : player.team === "blue"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-(--app-background) text-(--app-muted)"
                          }`}
                        >
                          {player.team
                            ? player.team === "red"
                              ? "Red"
                              : "Blue"
                            : "Unassigned"}
                        </span>
                        <span className="rounded-full border border-(--app-border) px-2 py-1 text-(--app-muted)">
                          {player.role === "spymaster"
                            ? "Spymaster"
                            : "Operative"}
                        </span>
                      </div>
                    </div>
                    {player.userId === room.ownerId ? (
                      <span className="text-sm text-(--app-muted)">Host</span>
                    ) : (
                      <span className="text-sm text-(--app-muted)">Player</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
