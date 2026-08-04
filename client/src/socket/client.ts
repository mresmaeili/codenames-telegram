import { io, Socket } from "socket.io-client";

interface SocketClientOptions {
  endpoint: string;
}

interface SocketClientStatus {
  connected: boolean;
  id: string | null;
}

interface SocketClientMessage {
  status: string;
  socketId: string;
  timestamp: string;
}

let socketInstance: Socket | null = null;

export function createSocketClient(options: SocketClientOptions): Socket {
  if (socketInstance) {
    return socketInstance;
  }

  socketInstance = io(options.endpoint, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
  });

  socketInstance.on("connect", () => {
    // connection lifecycle is handled by the app state
  });

  socketInstance.on("disconnect", (_reason: string) => {
    // connection lifecycle is handled by the app state
  });

  socketInstance.on("connected", (_payload: SocketClientMessage) => {
    // connection lifecycle is handled by the app state
  });

  socketInstance.on("error", (_message: string) => {
    // connection lifecycle is handled by the app state
  });

  return socketInstance;
}

export function getSocketClient(): Socket | null {
  return socketInstance;
}

export function getSocketClientStatus(): SocketClientStatus {
  if (!socketInstance) {
    return {
      connected: false,
      id: null,
    };
  }

  return {
    connected: socketInstance.connected,
    id: socketInstance.id ?? null,
  };
}

export function disconnectSocketClient(): void {
  if (!socketInstance) {
    return;
  }

  socketInstance.disconnect();
  socketInstance = null;
}
