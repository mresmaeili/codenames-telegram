import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const roomCode = process.env.E2E_ROOM_CODE;
const firstUser = process.env.E2E_USER_A ?? "Reconnect-A";
const secondUser = process.env.E2E_USER_B ?? "Reconnect-B";

if (!roomCode) {
  throw new Error("E2E_ROOM_CODE must point to an active development room.");
}

const browser = await chromium.launch({ headless: true });
const firstContext = await browser.newContext();
const secondContext = await browser.newContext();
const firstPage = await firstContext.newPage();
const secondPage = await secondContext.newPage();

function roomUrl(user) {
  const url = new URL(baseUrl);
  url.searchParams.set("dev", "1");
  url.searchParams.set("user", user);
  url.searchParams.set("room", roomCode);
  url.searchParams.set("v", String(Date.now()));
  return url.toString();
}

try {
  await Promise.all([
    firstPage.goto(roomUrl(firstUser), { waitUntil: "networkidle" }),
    secondPage.goto(roomUrl(secondUser), { waitUntil: "networkidle" }),
  ]);

  const firstCard = firstPage.locator('button[aria-label^="Select "]').first();
  await firstCard.waitFor({ state: "visible", timeout: 20_000 });
  await firstCard.click();
  await secondPage
    .locator(`img[title="${firstUser}"]`)
    .waitFor({ state: "visible", timeout: 10_000 });

  await secondContext.setOffline(true);
  await secondPage
    .getByText(/Disconnected from the server|Attempting to reconnect/i)
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
  await secondContext.setOffline(false);

  await secondPage
    .locator(`img[title="${firstUser}"]`)
    .waitFor({ state: "visible", timeout: 20_000 });
  assert.ok(await secondPage.locator(`img[title="${firstUser}"]`).count());
  console.log("Browser reconnect smoke test passed.");
} finally {
  await firstContext.close();
  await secondContext.close();
  await browser.close();
}
