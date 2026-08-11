import { Schema, model, type Document, type Model } from "mongoose";

export type WordLanguage = "fa" | "en";

export interface WordPoolRecord {
  name: string;
  language: WordLanguage;
  words: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordPoolDocument extends WordPoolRecord, Document {}

const wordPoolSchema = new Schema<WordPoolDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      enum: ["fa", "en"],
      default: "fa",
      index: true,
    },
    words: {
      type: [String],
      required: true,
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const WordPoolModel: Model<WordPoolDocument> = model<WordPoolDocument>(
  "WordPool",
  wordPoolSchema,
);
