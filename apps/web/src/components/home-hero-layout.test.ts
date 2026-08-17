import assert from "node:assert/strict";
import test from "node:test";

import { HERO_LAYOUT_CONFIG } from "./home-hero-layout.ts";

test("hero layout config covers every admin mode", () => {
  assert.deepEqual(Object.keys(HERO_LAYOUT_CONFIG).sort(), [
    "100/0",
    "40/60",
    "50/50",
  ]);
  assert.deepEqual(HERO_LAYOUT_CONFIG["40/60"], {
    hasMedia: true,
    imageSizes: "(max-width: 1023px) 100vw, (max-width: 1600px) 60vw, 960px",
  });
  assert.deepEqual(HERO_LAYOUT_CONFIG["50/50"], {
    hasMedia: true,
    imageSizes: "(max-width: 1023px) 100vw, (max-width: 1600px) 50vw, 800px",
  });
  assert.deepEqual(HERO_LAYOUT_CONFIG["100/0"], { hasMedia: false });
});
