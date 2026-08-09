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
let socketEndpoint: string | null = null;

export function createSocketClient(options: SocketClientOptions): Socket {
  if (socketInstance) {
    return socketInstance;
  }

  socketEndpoint = options.endpoint;
  socketInstance = io(options.endpoint, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
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

export function reconnectSocketClient(): Socket | null {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketEndpoint) {
    return null;
  }

  return createSocketClient({ endpoint: socketEndpoint });
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
