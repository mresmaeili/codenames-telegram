import { Schema, model, type Document, type Model } from "mongoose";

import {
  ROOM_MAX_PLAYERS,
  ROOM_PLAYER_ROLES,
  ROOM_STATUSES,
  ROOM_TEAMS,
} from "../../../shared/src/constants/room.js";
import type {
  Room,
  RoomPlayer,
  RoomSettings,
  RoomStatus,
  Team,
  PlayerRole,
} from "../../../shared/src/types/room.js";

export interface RoomDocument extends Omit<Room, "id">, Document {}

const roomPlayerSchema = new Schema<RoomPlayer>(
  {
    userId: {
      type: String,
      required: true,
    },
    telegramId: {
      type: Number,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    team: {
      type: String,
      enum: ROOM_TEAMS,
      default: null,
    },
    role: {
      type: String,
      enum: ROOM_PLAYER_ROLES,
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

const roomSettingsSchema = new Schema<RoomSettings>(
  {
    maxPlayers: {
      type: Number,
      required: true,
      default: ROOM_MAX_PLAYERS,
      min: 2,
      max: ROOM_MAX_PLAYERS,
    },
    allowSpectators: {
      type: Boolean,
      required: true,
      default: false,
    },
    privateRoom: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false },
);

const roomSchema = new Schema<RoomDocument>(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 4,
      maxlength: 8,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    players: {
      type: [roomPlayerSchema],
      default: [],
      validate: {
        validator(value: RoomPlayer[]) {
          return value.length <= ROOM_MAX_PLAYERS;
        },
        message: "Room player limit exceeded.",
      },
    },
    status: {
      type: String,
      enum: ROOM_STATUSES,
      required: true,
      default: "waiting",
    },
    settings: {
      type: roomSettingsSchema,
      required: true,
      default: () => ({
        maxPlayers: ROOM_MAX_PLAYERS,
        allowSpectators: false,
        privateRoom: true,
      }),
    },
  },
  {
    timestamps: true,
  },
);

export const RoomModel: Model<RoomDocument> = model<RoomDocument>(
  "Room",
  roomSchema,
);
