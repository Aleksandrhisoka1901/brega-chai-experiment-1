import assert from "node:assert/strict";
import test from "node:test";

import {
  bindShortRussianWords,
  bindTrailingShortRussianWord,
} from "./typography.ts";

test("binds short Russian service words to the following word", () => {
  assert.equal(
    bindShortRussianWords("Чай и в тишине становится личной практикой"),
    "Чай и\u00a0в\u00a0тишине становится личной практикой",
  );
  assert.equal(
    bindShortRussianWords("Ритуал для утра и без спешки"),
    "Ритуал для\u00a0утра и\u00a0без\u00a0спешки",
  );
});

test("binds across source line breaks and is idempotent", () => {
  const expected = "Разговор о\u00a0чае";
  assert.equal(bindShortRussianWords("Разговор о\nчае"), expected);
  assert.equal(bindShortRussianWords(expected), expected);
});

test("preserves punctuation, email addresses and unrelated short words", () => {
  assert.equal(
    bindShortRussianWords("Он сказал: «И, возможно, ушёл». ai@ai.com"),
    "Он сказал: «И, возможно, ушёл». ai@ai.com",
  );
});

test("binds a trailing service word before the next rich inline", () => {
  assert.equal(bindTrailingShortRussianWord("Чай и "), "Чай и\u00a0");
  assert.equal(bindTrailingShortRussianWord("Чай он "), "Чай он ");
});
