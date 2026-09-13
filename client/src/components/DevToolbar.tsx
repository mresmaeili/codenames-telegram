import { useEffect, useState } from "react";

import { getDevModeInfo, getDevModeUser, isDevModeEnabled } from "@/lib/dev";
import {
  disconnectSocketClient,
  getSocketClient,
  getSocketClientStatus,
  reconnectSocketClient,
} from "@/socket/client";

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

  useEffect(() => {
    if (!socket || !devUser) {
      return undefined;
    }

    const handleBotsPopulated = (payload: { roomCode?: unknown }) => {
      const roomCode =
        typeof payload.roomCode === "string"
          ? payload.roomCode
          : currentRoom?.toUpperCase();
      if (!roomCode) {
        return;
      }

      socket.emit("room:start", {
        roomCode,
        ownerTelegramId: devUser.telegramId,
      });
      pushEventLog("room:start", {
        roomCode,
        ownerTelegramId: devUser.telegramId,
      });
    };

    socket.on("room:devPopulated", handleBotsPopulated);
    return () => {
      socket.off("room:devPopulated", handleBotsPopulated);
    };
  }, [currentRoom, devUser, socket]);

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

  const handlePopulateGameplay = () => {
    const roomCode = currentRoom?.toUpperCase();
    if (!socket || !roomCode) {
      return;
    }

    socket.emit("room:populateBots", { roomCode, count: 5 });
    pushEventLog("room:populateBots", { roomCode, count: 5 });
  };

  const roomCode = currentRoom?.toUpperCase() || null;

  return (
    <div className="dev-toolbar border-t border-(--app-border) bg-(--app-background) px-3 py-2 text-xs text-(--app-muted)">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 truncate">
          <span className="font-semibold text-(--app-text)">DEV</span>
          <span>{devUser?.firstName}</span>
          <span>{roomCode}</span>
          <span className="font-medium">
            {socketStatus.connected ? "Online" : "Offline"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePopulateGameplay}
            className="rounded-full border border-(--app-border) px-3 py-2 text-(--app-text) transition hover:bg-(--app-border)"
          >
            Show gameplay with 5 players
          </button>
          <button
            type="button"
            onClick={handleResetRoom}
            className="rounded-full border border-(--app-border) px-3 py-2 text-(--app-text) transition hover:bg-(--app-border)"
          >
            Reset room
          </button>
          <button
            type="button"
            onClick={handleRevealKeycard}
            className="rounded-full border border-(--app-border) px-3 py-2 text-(--app-text) transition hover:bg-(--app-border)"
          >
            Reveal keycard
          </button>
          <button
            type="button"
            onClick={handleReconnect}
            className="rounded-full border border-(--app-border) px-3 py-2 text-(--app-text) transition hover:bg-(--app-border)"
          >
            Force reconnect
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="rounded-full border border-(--app-border) px-3 py-2 text-(--app-text) transition hover:bg-(--app-border)"
          >
            Disconnect socket
          </button>
        </div>
      </div>
      <div className="mx-auto mt-2 max-w-5xl rounded-xl border border-(--app-border) bg-(--app-background) p-2 text-[10px] text-(--app-text)">
        <p className="font-semibold text-(--app-text)">Socket event log</p>
        {eventLog.length === 0 ? (
          <p className="mt-2 text-(--app-muted)">
            No socket events received yet.
          </p>
        ) : (
          <div className="mt-2 max-h-24 space-y-2 overflow-auto">
            {eventLog.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className="rounded-lg border border-(--app-border) bg-(--app-surface) p-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-(--app-text)">
                    {entry.event}
                  </span>
                  <span className="text-(--app-muted)">
                    {entry.timestamp.slice(11, 19)}
                  </span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-(--app-text)">
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
