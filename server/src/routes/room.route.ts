import { Router } from "express";

import { getLobbyRoom } from "../services/lobby.service.js";
import {
  createRoom,
  joinRoom,
  startRoom,
  updateRoomPlayerAssignment,
  updateRoomSettings,
} from "../services/room.service.js";

interface CreateRoomRequestBody {
  ownerId?: unknown;
  ownerTelegramId?: unknown;
  ownerDisplayName?: unknown;
}

interface JoinRoomRequestBody {
  roomCode?: unknown;
  telegramId?: unknown;
  displayName?: unknown;
}

interface UpdateTeamRequestBody {
  telegramId?: unknown;
  team?: unknown;
  role?: unknown;
}

interface UpdateRoomSettingsRequestBody {
  ownerTelegramId?: unknown;
  settings?: unknown;
}

interface StartRoomRequestBody {
  ownerTelegramId?: unknown;
}

export const roomRouter = Router();

roomRouter.post("/", async (request, response, next) => {
  try {
    const body = request.body as CreateRoomRequestBody;

    if (
      typeof body.ownerId !== "string" ||
      typeof body.ownerTelegramId !== "number" ||
      typeof body.ownerDisplayName !== "string"
    ) {
      response.status(400).json({ message: "Invalid room creation payload." });
      return;
    }

    const room = await createRoom({
      ownerId: body.ownerId,
      ownerTelegramId: body.ownerTelegramId,
      ownerDisplayName: body.ownerDisplayName,
    });

    response.status(201).json(room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room creation failed.";
    response.status(400).json({ message });
  }
});

roomRouter.post("/join", async (request, response, next) => {
  try {
    const body = request.body as JoinRoomRequestBody;

    if (
      typeof body.roomCode !== "string" ||
      typeof body.telegramId !== "number" ||
      typeof body.displayName !== "string"
    ) {
      response.status(400).json({ message: "Invalid room join payload." });
      return;
    }

    const room = await joinRoom({
      roomCode: body.roomCode,
      telegramId: body.telegramId,
      displayName: body.displayName,
    });

    response.status(200).json(room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room join failed.";

    if (
      message.includes("not found") ||
      message.includes("full") ||
      message.includes("Invalid") ||
      message.includes("accepting") ||
      message.includes("Authenticated") ||
      message.includes("private")
    ) {
      response.status(400).json({ message });
      return;
    }

    response.status(500).json({ message });
    next(error);
  }
});

roomRouter.get("/:roomCode", async (request, response, next) => {
  try {
    const roomCode = request.params.roomCode;
    const room = await getLobbyRoom(roomCode);

    if (!room) {
      response.status(404).json({ message: "Room not found." });
      return;
    }

    response.status(200).json(room);
  } catch (error) {
    next(error);
  }
});

roomRouter.patch("/:roomCode/settings", async (request, response, next) => {
  try {
    const body = request.body as UpdateRoomSettingsRequestBody;
    const settings = body.settings;

    if (
      typeof body.ownerTelegramId !== "number" ||
      typeof settings !== "object" ||
      settings === null
    ) {
      response.status(400).json({ message: "Invalid room settings payload." });
      return;
    }

    const settingsPayload = settings as {
      maxPlayers?: unknown;
      allowSpectators?: unknown;
      privateRoom?: unknown;
      gameMode?: unknown;
      timer?: unknown;
      language?: unknown;
      wordPack?: unknown;
    };

    if (
      typeof settingsPayload.maxPlayers !== "number" ||
      typeof settingsPayload.allowSpectators !== "boolean" ||
      typeof settingsPayload.privateRoom !== "boolean" ||
      typeof settingsPayload.gameMode !== "string" ||
      typeof settingsPayload.timer !== "string" ||
      typeof settingsPayload.language !== "string" ||
      typeof settingsPayload.wordPack !== "string"
    ) {
      response.status(400).json({ message: "Invalid room settings payload." });
      return;
    }

    const room = await updateRoomSettings({
      roomCode: request.params.roomCode,
      ownerTelegramId: body.ownerTelegramId,
      settings: {
        maxPlayers: settingsPayload.maxPlayers,
        allowSpectators: settingsPayload.allowSpectators,
        privateRoom: settingsPayload.privateRoom,
        gameMode: settingsPayload.gameMode as "standard" | "rush",
        timer: settingsPayload.timer as "none" | "30" | "60" | "90",
        language: settingsPayload.language as "fa" | "en" | "es" | "he",
        wordPack: settingsPayload.wordPack as "classic" | "party",
      },
    });

    response.status(200).json(room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room settings update failed.";

    if (
      message.includes("not found") ||
      message.includes("owner") ||
      message.includes("settings") ||
      message.includes("Room code") ||
      message.includes("waiting") ||
      message.includes("Invalid")
    ) {
      response.status(400).json({ message });
      return;
    }

    response.status(500).json({ message });
    next(error);
  }
});

roomRouter.post("/:roomCode/start", async (request, response, next) => {
  try {
    const body = request.body as StartRoomRequestBody;

    if (typeof body.ownerTelegramId !== "number") {
      response.status(400).json({ message: "Invalid room start payload." });
      return;
    }

    const room = await startRoom({
      roomCode: request.params.roomCode,
      ownerTelegramId: body.ownerTelegramId,
    });

    response.status(200).json(room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room start failed.";

    if (
      message.includes("not found") ||
      message.includes("owner") ||
      message.includes("ready") ||
      message.includes("Room code") ||
      message.includes("waiting") ||
      message.includes("Invalid")
    ) {
      response.status(400).json({ message });
      return;
    }

    response.status(500).json({ message });
    next(error);
  }
});

roomRouter.patch("/:roomCode/team", async (request, response, next) => {
  try {
    const body = request.body as UpdateTeamRequestBody;

    if (
      typeof body.telegramId !== "number" ||
      !(typeof body.team === "string" || body.team === null) ||
      typeof body.role !== "string"
    ) {
      response
        .status(400)
        .json({ message: "Invalid team assignment payload." });
      return;
    }

    const room = await updateRoomPlayerAssignment({
      roomCode: request.params.roomCode,
      telegramId: body.telegramId,
      team: body.team,
      role: body.role,
    });

    response.status(200).json(room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Team assignment failed.";

    if (
      message.includes("not found") ||
      message.includes("not belong") ||
      message.includes("waiting") ||
      message.includes("Invalid") ||
      message.includes("Maximum") ||
      message.includes("Room code")
    ) {
      response.status(400).json({ message });
      return;
    }

    response.status(500).json({ message });
    next(error);
  }
});
