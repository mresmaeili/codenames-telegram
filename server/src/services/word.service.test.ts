import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_FARSI_WORDS,
  normalizeWordInput,
  sanitizeWordEntry,
} from "./word.service.js";

test("sanitizeWordEntry removes harmful values and trims text", () => {
  assert.equal(sanitizeWordEntry(" <script>alert(1)</script> hello "), "hello");
  assert.equal(sanitizeWordEntry("  سلام دنیا  "), "سلام دنیا");
  assert.equal(sanitizeWordEntry(""), "");
});

test("normalizeWordInput supports pasted lists and deduplicates", () => {
  const words = normalizeWordInput(
    "سلام, دنیای بازی\nکد\nسلام;دنیای بازی\n<script>alert(1)</script>",
  );

  assert.deepEqual(words, ["سلام", "دنیای بازی", "کد"]);
});

test("default Farsi word list contains 100 words", () => {
  assert.equal(DEFAULT_FARSI_WORDS.length, 100);
  assert.ok(DEFAULT_FARSI_WORDS.every((word) => word.trim().length > 0));
});
