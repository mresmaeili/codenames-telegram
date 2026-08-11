import { Schema, model, type Document, type Model } from "mongoose";

export interface TelegramUserRecord {
  telegramId: number;
  username?: string | null;
  firstName: string;
  lastName?: string | null;
  photoUrl?: string | null;
  ghibliAvatarUrl?: string | null;
  languageCode?: string | null;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramUserDocument extends TelegramUserRecord, Document {}

const userSchema = new Schema<TelegramUserDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      default: null,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    ghibliAvatarUrl: {
      type: String,
      default: null,
    },
    languageCode: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const UserModel: Model<TelegramUserDocument> =
  model<TelegramUserDocument>("User", userSchema);
