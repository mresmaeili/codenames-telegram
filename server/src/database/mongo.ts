import mongoose from "mongoose";

export type DatabaseConnectionState =
  | "connected"
  | "connecting"
  | "disconnecting"
  | "disconnected"
  | "error";

export interface DatabaseHealthStatus {
  status: DatabaseConnectionState;
  readyState: number;
  uriConfigured: boolean;
}

let eventHandlersRegistered = false;

function getConnectionState(): DatabaseConnectionState {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    case 0:
      return "disconnected";
    default:
      return "error";
  }
}

function registerConnectionHandlers() {
  if (eventHandlersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => {
    // connection lifecycle is handled by the server bootstrap
  });

  mongoose.connection.on("error", (_error: Error) => {
    // connection lifecycle is handled by the server bootstrap
  });

  mongoose.connection.on("disconnected", () => {
    // connection lifecycle is handled by the server bootstrap
  });

  eventHandlersRegistered = true;
}

export function getDatabaseConnectionStatus(): DatabaseConnectionState {
  return getConnectionState();
}

export function getDatabaseHealthStatus(): DatabaseHealthStatus {
  return {
    status: getDatabaseConnectionStatus(),
    readyState: mongoose.connection.readyState,
    uriConfigured: Boolean(process.env.MONGODB_URI),
  };
}

export async function connectToDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  registerConnectionHandlers();

  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined.");
  }

  try {
    await mongoose.connect(mongoUri);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to MongoDB: ${message}`);
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (
    mongoose.connection.readyState === 0 ||
    mongoose.connection.readyState === 3
  ) {
    return;
  }

  try {
    await mongoose.disconnect();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("MongoDB shutdown failed:", message);
  }
}
