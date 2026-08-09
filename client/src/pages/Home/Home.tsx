import { useEffect, useMemo, useState, type FormEvent } from "react";

import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GamePage } from "@/pages/Game";
import { LobbyPage } from "@/pages/Lobby";
import { getSocketClient } from "@/socket/client";

interface RoomResponse {
  id?: string;
  roomCode: string;
  ownerId: string;
  players: Array<{
    userId: string;
    telegramId: number;
    displayName: string;
    team: "red" | "blue" | null;
    role: "operative" | "spymaster";
    joinedAt: string;
  }>;
  status: string;
  settings: {
    maxPlayers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function HomePage() {
  const { user, loading, error } = useAuthContext();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [formValue, setFormValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"home" | "lobby" | "game">(
    "home",
  );
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const socket = useMemo(() => getSocketClient(), []);
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");

    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setFormValue(roomParam.toUpperCase());
      setActiveView("lobby");
    }
  }, []);

  useEffect(() => {
    if (!roomCode) {
      const params = new URLSearchParams(window.location.search);
      params.delete("room");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", nextUrl);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("room", roomCode);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [roomCode]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    function handleConnect() {
      toast.info("Reconnected. Restoring your room membership...");
      if (roomCode && user) {
        socket.emit("room:join", {
          roomCode,
          telegramId: user.telegramId,
          displayName: user.firstName,
        });
      }
    }

    function handleDisconnect(reason: string) {
      toast.error(
        `Disconnected from the server. Attempting to reconnect... (${reason})`,
      );
    }

    function handleRoomUpdated(room: RoomResponse) {
      if (room.status === "playing") {
        setActiveView("game");
      }
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:updated", handleRoomUpdated);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:updated", handleRoomUpdated);
    };
  }, [socket, roomCode, user, toast]);

  useEffect(() => {
    async function tryAutoJoinRoom() {
      if (autoJoinAttempted || !roomCode || !user || submitting) {
        return;
      }

      setAutoJoinAttempted(true);
      await joinRoomByCode(roomCode);
    }

    void tryAutoJoinRoom();
  }, [autoJoinAttempted, roomCode, user, submitting]);

  async function createRoom() {
    if (!user || submitting) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.telegramId.toString(),
          ownerTelegramId: user.telegramId,
          ownerDisplayName: user.firstName,
        }),
      });

      const payload = (await response.json()) as RoomResponse & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not create room.");
      }

      setRoomCode(payload.roomCode);
      setFormValue(payload.roomCode);
      setActiveView("lobby");
      setFeedback("Room created successfully.");
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Could not create room.";
      setFeedback(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function joinRoomByCode(roomCodeToJoin: string) {
    if (!user || submitting) {
      return null;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: roomCodeToJoin,
          telegramId: user.telegramId,
          displayName: user.firstName,
        }),
      });

      const payload = (await response.json()) as RoomResponse & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not join room.");
      }

      setRoomCode(payload.roomCode);
      setFormValue(payload.roomCode);
      setActiveView("lobby");
      setFeedback("Joined room successfully.");
      if (socket) {
        socket.emit("room:join", {
          roomCode: payload.roomCode,
          telegramId: user.telegramId,
          displayName: user.firstName,
        });
      }

      return payload;
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : "Could not join room.";
      setFeedback(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || submitting) {
      return;
    }

    await joinRoomByCode(formValue.trim().toUpperCase());
  }

  if (roomCode && activeView === "game") {
    return (
      <GamePage
        roomCode={roomCode}
        onLeave={() => {
          setRoomCode(null);
          setActiveView("home");
        }}
      />
    );
  }

  if (roomCode) {
    return (
      <LobbyPage
        roomCode={roomCode}
        onLeave={() => {
          setRoomCode(null);
          setActiveView("home");
        }}
        onGameStart={() => setActiveView("game")}
      />
    );
  }

  return (
    <PageContainer>
      <div className="w-full max-w-3xl space-y-6 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--app-text)] sm:text-5xl">
            Codenames Telegram Mini App
          </h1>
          <p className="text-[color:var(--app-muted)]">
            Create a room or join an existing one to start playing.
          </p>
        </div>

        {loading ? (
          <StatusPanel
            title="Authenticating"
            description="We are restoring your Telegram session and preparing the lobby experience."
            tone="info"
          />
        ) : error ? (
          <StatusPanel
            title="Authentication issue"
            description={error}
            tone="error"
          />
        ) : user ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-background)] p-4 text-left">
              <p className="text-sm text-[color:var(--app-muted)]">Signed in as</p>
              <p className="mt-1 font-semibold text-[color:var(--app-text)]">
                {user.firstName}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={createRoom}
                disabled={submitting}
                className="rounded-2xl bg-[var(--app-accent)] px-4 py-4 text-left text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <p className="font-semibold">Create room</p>
                <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                  Start a new lobby for your friends.
                </p>
              </button>

              <form
                onSubmit={joinRoom}
                className="space-y-3 rounded-2xl border border-[color:var(--app-border)] p-4"
              >
                <label
                  className="text-sm font-medium text-[color:var(--app-text)]"
                  htmlFor="roomCode"
                >
                  Join room
                </label>
                <input
                  id="roomCode"
                  value={formValue}
                  onChange={(event) =>
                    setFormValue(event.target.value.toUpperCase())
                  }
                  placeholder="Enter room code"
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[var(--app-background)] px-3 py-2 text-[color:var(--app-text)]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm font-medium text-[color:var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Working…" : "Join room"}
                </button>
              </form>
            </div>

            {feedback ? (
              <StatusPanel
                title={submitting ? "Working" : "Update"}
                description={feedback}
                tone={
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("could not")
                    ? "error"
                    : "success"
                }
              />
            ) : null}
          </div>
        ) : (
          <StatusPanel
            title="Authentication unavailable"
            description="We could not restore your Telegram session. Please reopen the Mini App from Telegram."
            tone="error"
          />
        )}
      </div>
    </PageContainer>
  );
}
