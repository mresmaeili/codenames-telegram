import { useEffect, useMemo, useState, type FormEvent } from "react";

import { PageContainer } from "@/components/PageContainer";
import { StatusPanel } from "@/components/StatusPanel";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiUrl } from "@/config/env";
import { GamePage } from "@/pages/Game";
import { LobbyPage } from "@/pages/Lobby";
import { getSocketClient } from "@/socket/client";
import { FUNNY_AVATARS } from "@/lib/avatar";

interface RoomResponse {
  id?: string;
  roomCode: string;
  ownerId: number;
  ownerIds: number[];
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
  const { user, loading, error, loginWithGuest, logoutGuest } =
    useAuthContext();
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem("codenames.lastRoomCode");
    } catch {
      return null;
    }
  });
  const [formValue, setFormValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestAvatarId, setGuestAvatarId] = useState<string | undefined>();
  const [isGuestSession, setIsGuestSession] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "lobby" | "game">(
    "home",
  );
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const socket = useMemo(() => getSocketClient(), []);
  const toast = useToast();

  useEffect(() => {
    try {
      setIsGuestSession(
        Boolean(window.localStorage.getItem("codenames.guestSession")),
      );
    } catch {
      setIsGuestSession(false);
    }
  }, [user]);

  useEffect(() => {
    const hasPrivateRoom = Boolean(
      new URLSearchParams(window.location.search).get("room") || roomCode,
    );
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      robots.setAttribute(
        "content",
        hasPrivateRoom ? "noindex, nofollow" : "index, follow",
      );
    }
    document.title = hasPrivateRoom
      ? "Private Room | Codenames Telegram Mini App"
      : "کدنیمز فارسی | بازی کلمات گروهی با دوستان";
  }, [roomCode]);

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
    if (!user) {
      return;
    }

    const hasExplicitRoom = Boolean(
      new URLSearchParams(window.location.search).get("room"),
    );

    try {
      const storedUserId = window.localStorage.getItem(
        "codenames.lastRoomUserId",
      );

      if (!hasExplicitRoom && storedUserId !== String(user.telegramId)) {
        window.localStorage.removeItem("codenames.lastRoomCode");
        setRoomCode(null);
        setActiveView("home");
      }
    } catch {
      // ignored in restricted browser contexts
    }
  }, [user]);

  useEffect(() => {
    if (!roomCode) {
      try {
        window.localStorage.removeItem("codenames.lastRoomCode");
      } catch {
        // ignored in restricted browser contexts
      }

      const params = new URLSearchParams(window.location.search);
      params.delete("room");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", nextUrl);
      return;
    }

    try {
      window.localStorage.setItem("codenames.lastRoomCode", roomCode);
      if (user) {
        window.localStorage.setItem(
          "codenames.lastRoomUserId",
          String(user.telegramId),
        );
      }
    } catch {
      // ignored in restricted browser contexts
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
          avatarId: user.avatarId ?? undefined,
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

    // If socket is already connected, ensure we join the room immediately
    if (socket.connected && roomCode && user) {
      socket.emit("room:join", {
        roomCode,
        telegramId: user.telegramId,
        displayName: user.firstName,
        avatarId: user.avatarId ?? undefined,
      });
    }

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
      const response = await fetch(apiUrl("/api/rooms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.telegramId.toString(),
          ownerTelegramId: user.telegramId,
          ownerDisplayName: user.firstName,
          ownerAvatarId: user.avatarId ?? undefined,
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
      setActiveView(payload.status === "playing" ? "game" : "lobby");
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
      const response = await fetch(apiUrl("/api/rooms/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: roomCodeToJoin,
          telegramId: user.telegramId,
          displayName: user.firstName,
          avatarId: user.avatarId ?? undefined,
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
          avatarId: user.avatarId ?? undefined,
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

  async function submitGuestLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || guestName.trim().length < 2) return;
    await loginWithGuest(guestName, guestAvatarId);
  }

  if (roomCode && activeView === "game") {
    return (
      <GamePage
        roomCode={roomCode}
        onLeave={() => {
          setRoomCode(null);
          setActiveView("home");
        }}
        onReturnToLobby={() => setActiveView("lobby")}
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
      <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-6">
        <div className="w-full rounded-[28px] border border-white/10 bg-[#0b69ad] px-4 py-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] sm:px-8 sm:py-7">
          <div className="relative space-y-2 text-center">
            {user && isGuestSession ? (
              <button
                type="button"
                onClick={logoutGuest}
                className="absolute right-0 top-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/20"
              >
                Log out
              </button>
            ) : null}
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#dfeeff]">
              Codenames
            </p>
            <h1 className="text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
              Mini App
            </h1>
          </div>

          {!roomCode ? (
            <section className="sr-only" lang="fa" aria-label="معرفی بازی">
              <h2>کدنیمز فارسی | بازی کلمات گروهی با دوستان</h2>
              <p>
                کدنیمز فارسی یک بازی کلمات گروهی آنلاین برای بازی با دوستان است.
                بازیکنان در دو تیم رقابت می‌کنند، سرنخ‌های خلاقانه می‌دهند و با
                همکاری یکدیگر کلمات درست را حدس می‌زنند. یک اتاق بسازید و دوستان
                خود را برای یک بازی دوستانه دعوت کنید.
              </p>
            </section>
          ) : null}

          {loading ? (
            <div className="mt-5">
              <StatusPanel
                title="Authenticating"
                description="Preparing your game space..."
                tone="info"
              />
            </div>
          ) : error ? (
            <div className="mt-5">
              <StatusPanel
                title="Authentication issue"
                description={error}
                tone="error"
              />
            </div>
          ) : user ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-white/8 p-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfeeff]">
                  Signed in as
                </p>
                <p className="mt-1 text-base font-bold text-white">
                  {user.firstName}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={createRoom}
                  disabled={submitting}
                  className="rounded-2xl border border-[#d4eeff] bg-[#ffffff] px-4 py-3 text-left text-[#0b69ad] shadow-[0_6px_12px_rgba(14,35,67,0.2)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <p className="text-base font-black uppercase tracking-[0.08em]">
                    Create room
                  </p>
                  <p className="mt-1 text-sm text-[#0d5ca6]">
                    Start a new lobby for your friends.
                  </p>
                </button>

                <form
                  onSubmit={joinRoom}
                  className="space-y-3 rounded-2xl border border-white/15 bg-[#0f5ea9] p-3"
                >
                  <label
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfeeff]"
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
                    className="w-full rounded-xl border border-white/15 bg-[#1d7bd7] px-3 py-2.5 text-sm text-white placeholder:text-[#dfeeff] outline-none ring-0"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl border border-white/15 bg-[#c92f16] px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Working…" : "Join room"}
                  </button>
                </form>
              </div>

              {feedback ? (
                <div className="mt-2">
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
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <form
                onSubmit={submitGuestLogin}
                className="space-y-4 rounded-3xl border border-white/15 bg-white/8 p-4"
              >
                <div>
                  <p className="text-lg font-bold text-white">
                    Play with friends
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#dfeeff]">
                    Choose a name to create a room or join one.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfeeff]">
                    Avatar{" "}
                    <span className="font-normal normal-case tracking-normal">
                      (optional)
                    </span>
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {FUNNY_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() =>
                          setGuestAvatarId((current) =>
                            current === avatar.id ? undefined : avatar.id,
                          )
                        }
                        aria-label={`Choose ${avatar.label} avatar`}
                        aria-pressed={guestAvatarId === avatar.id}
                        className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl transition-transform hover:-translate-y-0.5 ${guestAvatarId === avatar.id ? "border-[#b8ff8e] bg-[#51df20]/30" : "border-white/15 bg-[#1d7bd7]"}`}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="guestName"
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfeeff]"
                  >
                    Your name
                  </label>
                  <input
                    id="guestName"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Enter a name"
                    maxLength={24}
                    autoComplete="nickname"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#1d7bd7] px-3 py-2.5 text-sm text-white placeholder:text-[#dfeeff] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || guestName.trim().length < 2}
                  className="w-full rounded-xl border border-white/15 bg-[#c92f16] px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Start playing
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
