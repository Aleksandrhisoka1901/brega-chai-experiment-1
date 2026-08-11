import assert from "node:assert/strict";
import test from "node:test";

import { validateHeroImage } from "../src/api/home-page/content-types/home-page/validation.ts";

test("requires an image for split hero layouts", () => {
  assert.throws(
    () => validateHeroImage({ layout: "50/50" }),
    /image and alt are required/,
  );
  assert.doesNotThrow(() =>
    validateHeroImage({ layout: "40/60", image: { alt: "Tea" } }),
  );
});

test("permits a text-only 100/0 hero", () => {
  assert.doesNotThrow(() => validateHeroImage({ layout: "100/0" }));
});
