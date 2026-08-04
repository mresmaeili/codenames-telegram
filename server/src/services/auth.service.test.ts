import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { authenticateTelegramUser } from "./auth.service.js";
import { UserModel } from "../models/user.model.js";

function buildInitData(userId: number, firstName: string): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: firstName }),
  });

  const checkString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const hash = crypto
    .createHmac("sha256", "test-token")
    .update(checkString)
    .digest("hex");

  params.set("hash", hash);
  return params.toString();
}

test("authenticateTelegramUser creates a new user for valid init data", async () => {
  const originalCreate = UserModel.create;
  const originalFindOne = UserModel.findOne;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";

  (
    UserModel as unknown as { findOne: (query: unknown) => Promise<unknown> }
  ).findOne = async () => null;
  (
    UserModel as unknown as { create: (input: unknown) => Promise<unknown> }
  ).create = async (input) => ({
    telegramId: (input as { telegramId: number }).telegramId,
    username: null,
    firstName: (input as { firstName: string }).firstName,
    lastName: null,
    photoUrl: null,
    languageCode: null,
    lastLoginAt: new Date("2024-01-01T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  });

  try {
    const user = await authenticateTelegramUser(buildInitData(1, "Agent"));

    assert.equal(user.telegramId, 1);
    assert.equal(user.firstName, "Agent");
  } finally {
    UserModel.create = originalCreate;
    UserModel.findOne = originalFindOne;
    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
  }
});

test("authenticateTelegramUser rejects invalid init data", async () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";

  try {
    await assert.rejects(
      () => authenticateTelegramUser("auth_date=1&hash=abc"),
      /expired|invalid|signature/i,
    );
  } finally {
    if (originalToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
  }
});
