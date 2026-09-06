import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";

import { registerRoomSocketHandlers } from "./room.socket.js";
import { authenticateTelegramUser } from "../services/auth.service.js";
import { env } from "../config/env.js";

interface SocketServerOptions {
  corsOrigin: string;
}

export interface SocketServerStatus {
  connectedClients: number;
  isRunning: boolean;
}

export function createSocketServer(
  httpServer: HttpServer,
  options: SocketServerOptions,
) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: options.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as {
      initData?: unknown;
      dev?: unknown;
    };

    if (env.DEV_MODE && auth.dev === true) {
      socket.data.devMode = true;
    } else if (typeof auth.initData === "string" && auth.initData.trim()) {
      try {
        const user = await authenticateTelegramUser(auth.initData);
        socket.data.telegramId = user.telegramId;
      } catch {
        next(new Error("Socket authentication failed."));
        return;
      }
    } else {
      next(new Error("Socket authentication is required."));
      return;
    }

    next();
  });

  io.on("connection", (socket: Socket) => {
    registerRoomSocketHandlers(io, socket);

    socket.emit("connected", {
      status: "connected",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", (_reason: string) => {
      // connection lifecycle is handled externally
    });

    socket.on("connect", () => {
      // reconnection lifecycle is handled externally
    });
  });

  return {
    io,
    getStatus(): SocketServerStatus {
      return {
        connectedClients: io.sockets.sockets.size,
        isRunning: true,
      };
    },
  };
}
