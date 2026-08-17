import assert from "node:assert/strict";
import test from "node:test";

import {
  activeGalleryIndex,
  galleryTransitionReducer,
  initialGalleryTransitionState,
  renderedGalleryIndexes,
} from "./product-gallery-transition.ts";

test("keeps the old layer until the selected image loads and fades", () => {
  const loading = galleryTransitionReducer(initialGalleryTransitionState, {
    type: "select",
    index: 1,
  });
  assert.deepEqual(renderedGalleryIndexes(loading), [0, 1]);
  assert.equal(activeGalleryIndex(loading), 0);

  const staleLoad = galleryTransitionReducer(loading, {
    type: "load",
    index: 2,
  });
  assert.equal(staleLoad, loading);

  const ready = galleryTransitionReducer(loading, {
    type: "load",
    index: 1,
  });
  const reducedMotionSettled = galleryTransitionReducer(ready, {
    type: "finish-fade",
    index: 1,
  });
  assert.deepEqual(renderedGalleryIndexes(reducedMotionSettled), [1]);

  const fading = galleryTransitionReducer(ready, { type: "start-fade" });
  assert.equal(activeGalleryIndex(fading), 1);
  assert.deepEqual(renderedGalleryIndexes(fading), [0, 1]);

  const settled = galleryTransitionReducer(fading, {
    type: "finish-fade",
    index: 1,
  });
  assert.equal(activeGalleryIndex(settled), 1);
  assert.deepEqual(renderedGalleryIndexes(settled), [1]);
});

test("rapid selections replace stale pending layers and keep at most two", () => {
  const loadingSecond = galleryTransitionReducer(
    initialGalleryTransitionState,
    { type: "select", index: 1 },
  );
  const loadingThird = galleryTransitionReducer(loadingSecond, {
    type: "select",
    index: 2,
  });
  assert.deepEqual(renderedGalleryIndexes(loadingThird), [0, 2]);

  const readyThird = galleryTransitionReducer(loadingThird, {
    type: "load",
    index: 2,
  });
  const fadingThird = galleryTransitionReducer(readyThird, {
    type: "start-fade",
  });
  const reversingToFirst = galleryTransitionReducer(fadingThird, {
    type: "select",
    index: 0,
  });
  assert.equal(reversingToFirst.phase, "ready");
  assert.deepEqual(renderedGalleryIndexes(reversingToFirst), [2, 0]);

  const loadingFourth = galleryTransitionReducer(fadingThird, {
    type: "select",
    index: 3,
  });
  assert.deepEqual(renderedGalleryIndexes(loadingFourth), [2, 3]);
  assert.equal(activeGalleryIndex(loadingFourth), 2);
});
