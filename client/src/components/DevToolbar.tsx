import { useEffect, useState } from "react";

import {
  getDevModeInfo,
  getDevModeUrl,
  getDevModeUser,
  isDevModeEnabled,
} from "@/lib/dev";
import {
  disconnectSocketClient,
  getSocketClient,
  getSocketClientStatus,
  reconnectSocketClient,
} from "@/socket/client";

const fakeUsers = ["alice", "bob", "charlie"];

export function DevToolbar() {
  const devModeEnabled = isDevModeEnabled();
  const devUser = getDevModeUser();
  const { room: currentRoom } = getDevModeInfo();
  const [socketStatus, setSocketStatus] = useState(getSocketClientStatus());
  const [eventLog, setEventLog] = useState<
    Array<{ event: string; payload: unknown; timestamp: string }>
  >([]);
  const socket = getSocketClient();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSocketStatus(getSocketClientStatus());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleAny = (event: string, ...payload: unknown[]) => {
      setEventLog((current) =>
        [
          {
            event,
            payload: payload.length === 1 ? payload[0] : payload,
            timestamp: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20),
      );
    };

    socket.onAny(handleAny);

    return () => {
      socket.offAny(handleAny);
    };
  }, [socket]);

  if (!devModeEnabled || typeof window === "undefined") {
    return null;
  }

  const pushEventLog = (event: string, payload: unknown) => {
    setEventLog((current) =>
      [
        {
          event,
          payload,
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 20),
    );
  };

  const handleReconnect = () => {
    disconnectSocketClient();
    window.location.reload();
  };

  const handleDisconnect = () => {
    disconnectSocketClient();
    setSocketStatus(getSocketClientStatus());
  };

  const handleResetRoom = () => {
    const roomCode = currentRoom?.toUpperCase();
    if (!socket || !roomCode) {
      return;
    }

    socket.emit("room:reset", { roomCode });
    pushEventLog("room:reset", { roomCode });
  };

  const handleRevealKeycard = () => {
    const roomCode = currentRoom?.toUpperCase();
    if (!socket || !roomCode) {
      return;
    }

    socket.emit("game:debugReveal", { roomCode });
    pushEventLog("game:debugReveal", { roomCode });
  };

  const roomCode = currentRoom?.toUpperCase() || null;

  return (
    <div className="border-t border-[color:var(--app-border)] bg-[var(--app-background)] px-6 py-4 text-sm text-[color:var(--app-muted)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="min-w-[240px] space-y-2">
          <p className="font-semibold text-[color:var(--app-text)]">
            Dev mode active
          </p>
          <p>
            Fake user: <span className="font-medium">{devUser?.firstName}</span>
          </p>
          {roomCode ? (
            <p>
              Room: <span className="font-medium">{roomCode}</span>
            </p>
          ) : null}
          <p>
            Socket:{" "}
            <span className="font-medium">
              {socketStatus.connected ? "Connected" : "Disconnected"}
            </span>
          </p>
          {socketStatus.id ? (
            <p className="truncate">ID: {socketStatus.id}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {fakeUsers.map((userName) => (
            <button
              key={userName}
              type="button"
              onClick={() => {
                window.open(
                  getDevModeUrl(userName, roomCode ?? undefined),
                  "_blank",
                );
              }}
              className="rounded-full border border-[color:var(--app-border)] px-3 py-2 text-[color:var(--app-text)] transition hover:bg-[color:var(--app-border)]"
            >
              Open {userName}
            </button>
          ))}
          <button
            type="button"
            onClick={handleResetRoom}
            className="rounded-full border border-[color:var(--app-border)] px-3 py-2 text-[color:var(--app-text)] transition hover:bg-[color:var(--app-border)]"
          >
            Reset room
          </button>
          <button
            type="button"
            onClick={handleRevealKeycard}
            className="rounded-full border border-[color:var(--app-border)] px-3 py-2 text-[color:var(--app-text)] transition hover:bg-[color:var(--app-border)]"
          >
            Reveal keycard
          </button>
          <button
            type="button"
            onClick={handleReconnect}
            className="rounded-full border border-[color:var(--app-border)] px-3 py-2 text-[color:var(--app-text)] transition hover:bg-[color:var(--app-border)]"
          >
            Force reconnect
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="rounded-full border border-[color:var(--app-border)] px-3 py-2 text-[color:var(--app-text)] transition hover:bg-[color:var(--app-border)]"
          >
            Disconnect socket
          </button>
        </div>
      </div>
      <div className="mx-auto mt-4 max-w-5xl rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-background)] p-4 text-xs text-[color:var(--app-text)]">
        <p className="font-semibold text-[color:var(--app-text)]">
          Socket event log
        </p>
        {eventLog.length === 0 ? (
          <p className="mt-2 text-[color:var(--app-muted)]">
            No socket events received yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3 max-h-60 overflow-auto">
            {eventLog.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-[color:var(--app-text)]">
                    {entry.event}
                  </span>
                  <span className="text-[color:var(--app-muted)]">
                    {entry.timestamp.slice(11, 19)}
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[color:var(--app-text)]">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
