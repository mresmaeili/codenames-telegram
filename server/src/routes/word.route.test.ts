import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

process.env.ADMIN_KEY = "test-admin";

import { createApp } from "../app.js";
import { WordPoolModel } from "../models/word.model.js";

async function startTestServer() {
  const app = createApp();
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test("GET /api/words/pools returns saved word pools", async () => {
  const originalFind = WordPoolModel.find;
  (WordPoolModel as any).find = () => ({
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [
      {
        name: "Farsi default",
        language: "fa",
        words: ["آب", "آتش", "آسمان"],
        isDefault: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    ],
  });

  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/words/pools`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.ok(Array.isArray(payload.pools));
    assert.equal(payload.pools[0].name, "Farsi default");
    assert.equal(payload.pools[0].language, "fa");
    assert.deepEqual(payload.pools[0].words, ["آب", "آتش", "آسمان"]);
  } finally {
    WordPoolModel.find = originalFind;
    server.close();
  }
});

test("POST /api/words/pools saves a valid word pool", async () => {
  const originalUpdateMany = WordPoolModel.updateMany;
  const originalFindOneAndUpdate = WordPoolModel.findOneAndUpdate;

  (WordPoolModel as any).updateMany = () => ({
    exec: async () => ({}) as any,
  });
  (WordPoolModel as any).findOneAndUpdate = () => ({
    exec: async () => ({
      name: "Farsi pack",
      language: "fa",
      words: [
        "آب",
        "آتش",
        "آسمان",
        "آینه",
        "بابا",
        "تابستان",
        "چراغ",
        "خانه",
        "دوست",
        "روز",
        "راه",
        "زمین",
        "زبان",
        "ساعت",
        "سیب",
        "شیر",
        "عسل",
        "غذا",
        "فصل",
        "قلم",
        "کتاب",
        "گل",
        "لبخند",
        "میز",
        "نور",
      ],
      isDefault: true,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    }),
  });

  const { server, baseUrl } = await startTestServer();

  try {
    const body = {
      name: "Farsi pack",
      language: "fa",
      words: [
        "آب",
        "آتش",
        "آسمان",
        "آینه",
        "بابا",
        "تابستان",
        "چراغ",
        "خانه",
        "دوست",
        "روز",
        "راه",
        "زمین",
        "زبان",
        "ساعت",
        "سیب",
        "شیر",
        "عسل",
        "غذا",
        "فصل",
        "قلم",
        "کتاب",
        "گل",
        "لبخند",
        "میز",
        "نور",
      ],
      adminKey: "test-admin",
    };

    const response = await fetch(`${baseUrl}/api/words/pools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.pool.name, "Farsi pack");
    assert.equal(payload.pool.language, "fa");
    assert.equal(payload.pool.words.length, 25);
    assert.equal(payload.pool.isDefault, true);
  } finally {
    WordPoolModel.updateMany = originalUpdateMany;
    WordPoolModel.findOneAndUpdate = originalFindOneAndUpdate;
    server.close();
  }
});
