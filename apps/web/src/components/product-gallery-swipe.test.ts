import assert from "node:assert/strict";
import test from "node:test";

import { getGallerySwipeStep } from "./product-gallery-swipe.ts";

test("maps deliberate horizontal swipes to adjacent gallery images", () => {
  assert.equal(
    getGallerySwipeStep({
      startX: 320,
      startY: 200,
      endX: 120,
      endY: 210,
      width: 390,
    }),
    1,
  );
  assert.equal(
    getGallerySwipeStep({
      startX: 80,
      startY: 200,
      endX: 280,
      endY: 190,
      width: 390,
    }),
    -1,
  );
});

test("ignores short and predominantly vertical gestures", () => {
  assert.equal(
    getGallerySwipeStep({
      startX: 220,
      startY: 200,
      endX: 190,
      endY: 202,
      width: 390,
    }),
    0,
  );
  assert.equal(
    getGallerySwipeStep({
      startX: 220,
      startY: 120,
      endX: 160,
      endY: 310,
      width: 390,
    }),
    0,
  );
});
