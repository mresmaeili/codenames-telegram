import { Schema, model, type Document, type Model } from "mongoose";

import type {
  Game,
  Card,
  CardColor,
  GameStatus,
  Turn,
} from "../../../shared/src/types/game.js";

export interface GameDocument extends Omit<Game, "id">, Document {}

const cardSchema = new Schema<Card>(
  {
    word: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      enum: ["red", "blue", "neutral", "assassin"],
      default: null,
    },
    revealed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false },
);

const gameSchema = new Schema<GameDocument>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "finished"],
      required: true,
      default: "active",
    },
    board: {
      type: [cardSchema],
      required: true,
      default: [],
    },
    startingTeam: {
      type: String,
      enum: ["red", "blue"],
      required: true,
    },
    currentTurn: {
      type: String,
      enum: ["red", "blue"],
      required: true,
    },
    remainingGuesses: {
      type: Number,
      required: true,
      default: 0,
    },
    currentHintWord: {
      type: String,
      default: null,
      trim: true,
    },
    currentHintNumber: {
      type: Number,
      default: null,
    },
    hintSubmittedAt: {
      type: Date,
      default: null,
    },
    selectedCardId: {
      type: String,
      default: null,
    },
    selectedByPlayerId: {
      type: String,
      default: null,
    },
    selectedAt: {
      type: Date,
      default: null,
    },
    winningTeam: {
      type: String,
      enum: ["red", "blue"],
      default: null,
    },
    completionReason: {
      type: String,
      enum: [
        "all-red-cards-revealed",
        "all-blue-cards-revealed",
        "assassin-revealed",
      ],
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const GameModel: Model<GameDocument> = model<GameDocument>(
  "Game",
  gameSchema,
);
