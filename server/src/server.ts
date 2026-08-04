import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectToDatabase, disconnectFromDatabase } from "./database/mongo.js";
import { createSocketServer } from "./sockets/socket.server.js";

const app = createApp();

let server: ReturnType<typeof app.listen> | null = null;
let socketServer: ReturnType<typeof createSocketServer> | null = null;

async function startServer() {
  try {
    await connectToDatabase();

    server = app.listen(env.PORT, "0.0.0.0");

    socketServer = createSocketServer(server, {
      corsOrigin: env.CORS_ORIGIN,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to start server: ${message}`);
    await disconnectFromDatabase();
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  // graceful shutdown is handled by the process lifecycle

  if (server) {
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });

    return;
  }

  await disconnectFromDatabase();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
