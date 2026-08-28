import assert from "node:assert/strict";
import test from "node:test";

import {
  STOREFRONT_INK,
  STOREFRONT_PAPER,
  shouldResetAboutColors,
  shouldRestoreHeroPalette,
} from "../src/home-palette-configuration.ts";

test("restores a flattened beige hero and keeps a graphite hero", () => {
  assert.equal(
    shouldRestoreHeroPalette({
      backgroundColor: "#d7cfbe",
      textColor: "#2f2c2c",
    }),
    true,
  );
  assert.equal(
    shouldRestoreHeroPalette({
      backgroundColor: STOREFRONT_INK,
      textColor: STOREFRONT_PAPER,
    }),
    false,
  );
});

test("clears about colors that disappear into their own surface", () => {
  assert.equal(
    shouldResetAboutColors({
      backgroundColor: "#f5efef",
      textColor: "#f5efef",
    }),
    true,
  );
  assert.equal(
    shouldResetAboutColors({
      backgroundColor: null,
      textColor: null,
    }),
    false,
  );
});
