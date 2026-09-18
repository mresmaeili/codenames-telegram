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

async function readGameSnapshot(page) {
  const cards = page.locator(
    'button[aria-label^="Locked "], button[aria-label^="Select "], button[aria-label^="Selected "], button[aria-label^="Show revealed "], button[aria-label^="Hide revealed "]',
  );
  await cards.first().waitFor({ state: "visible", timeout: 20_000 });
  return {
    cardCount: await cards.count(),
    firstCardLabel: await cards.first().getAttribute("aria-label"),
  };
}

try {
  await Promise.all([
    firstPage.goto(roomUrl(firstUser), { waitUntil: "domcontentloaded" }),
    secondPage.goto(roomUrl(secondUser), { waitUntil: "domcontentloaded" }),
  ]);

  const firstSnapshot = await readGameSnapshot(firstPage);
  const secondSnapshot = await readGameSnapshot(secondPage);
  assert.equal(secondSnapshot.cardCount, firstSnapshot.cardCount);
  assert.equal(secondSnapshot.firstCardLabel, firstSnapshot.firstCardLabel);

  await secondContext.setOffline(true);
  await secondPage
    .getByText(/Disconnected from the server|Attempting to reconnect/i)
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
  await secondContext.setOffline(false);

  const resumedSnapshot = await readGameSnapshot(secondPage);
  assert.deepEqual(resumedSnapshot, secondSnapshot);
  console.log("Browser reconnect smoke test passed.");
} finally {
  await firstContext.close();
  await secondContext.close();
  await browser.close();
}
