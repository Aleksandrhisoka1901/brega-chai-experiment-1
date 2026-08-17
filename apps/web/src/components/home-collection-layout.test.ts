import assert from "node:assert/strict";
import test from "node:test";

import { getHomeCollectionLayout } from "./home-collection-layout.ts";

test("home collections hide empty sections and overflow only past four cards", () => {
  assert.deepEqual(getHomeCollectionLayout(0), {
    mode: "hidden",
    visibleCardCount: 0,
  });

  for (const count of [1, 2, 3, 4]) {
    assert.deepEqual(getHomeCollectionLayout(count), {
      mode: "fixed",
      visibleCardCount: count,
    });
  }

  assert.deepEqual(getHomeCollectionLayout(5), {
    mode: "slider",
    visibleCardCount: 4,
  });
});

test("home collection layout rejects invalid counts", () => {
  assert.throws(() => getHomeCollectionLayout(-1), /non-negative integer/);
  assert.throws(() => getHomeCollectionLayout(1.5), /non-negative integer/);
});
