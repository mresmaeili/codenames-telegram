import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";

import { registerRoomSocketHandlers } from "./room.socket.js";

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

  io.on("connection", (socket: Socket) => {
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

    registerRoomSocketHandlers(io, socket);
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
