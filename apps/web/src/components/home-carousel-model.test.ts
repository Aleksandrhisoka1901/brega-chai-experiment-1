import assert from "node:assert/strict";
import test from "node:test";

import {
  getCarouselControls,
  moveCarouselPage,
} from "./home-carousel-model.ts";

test("controls appear only when more than four cards exist", () => {
  assert.deepEqual(getCarouselControls(4, 0), {
    visible: false,
    previousDisabled: true,
    nextDisabled: true,
  });
  assert.equal(getCarouselControls(5, 0).visible, true);
});

test("finite carousel navigation clamps at both ends", () => {
  assert.equal(moveCarouselPage(0, -1, 6), 0);
  assert.equal(moveCarouselPage(0, 1, 6), 1);
  assert.equal(moveCarouselPage(1, 1, 6), 1);
});
