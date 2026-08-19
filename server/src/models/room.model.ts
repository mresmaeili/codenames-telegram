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
      default: false,
    },
    gameMode: {
      type: String,
      required: true,
      enum: ["standard", "rush"],
      default: "standard",
    },
    timer: {
      type: String,
      required: true,
      enum: ["none", "30", "60", "90"],
      default: "60",
    },
    language: {
      type: String,
      required: true,
      enum: ["fa", "en", "es", "he"],
      default: "fa",
    },
    wordPack: {
      type: String,
      required: true,
      enum: ["classic", "party"],
      default: "classic",
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
      type: Number,
      required: true,
    },
    ownerIds: {
      type: [Number],
      required: true,
      default: [],
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
        privateRoom: false,
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
