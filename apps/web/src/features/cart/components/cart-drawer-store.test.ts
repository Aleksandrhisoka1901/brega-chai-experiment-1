import assert from "node:assert/strict";
import test from "node:test";

import { createCartDrawerStore } from "./cart-drawer-store.ts";

test("opens, closes and preserves the latest trigger for focus return", () => {
  const store = createCartDrawerStore();
  const firstTrigger = { focus() {} } as HTMLElement;
  const secondTrigger = { focus() {} } as HTMLElement;
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  store.open(firstTrigger);
  assert.equal(store.getSnapshot().open, true);
  assert.equal(store.getTrigger(), firstTrigger);

  store.open(secondTrigger);
  assert.equal(store.getSnapshot().open, true);
  assert.equal(store.getTrigger(), secondTrigger);
  assert.equal(notifications, 1);

  store.close();
  assert.equal(store.getSnapshot().open, false);
  assert.equal(notifications, 2);
});
