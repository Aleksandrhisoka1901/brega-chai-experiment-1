import assert from "node:assert/strict";
import test from "node:test";

import {
  METRIKA_GOALS,
  reachMetrikaGoal,
  YANDEX_METRIKA_COUNTER_ID,
} from "./goals.ts";

test("reachGoal no-ops without ym and forwards when present", () => {
  const previous = globalThis.window;
  const calls: unknown[][] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ym: (...arguments_: unknown[]) => {
        calls.push(arguments_);
      },
    },
  });

  reachMetrikaGoal(METRIKA_GOALS.inquirySubmit, { source: "/dlya-optovikov" });

  assert.deepEqual(calls, [
    [
      YANDEX_METRIKA_COUNTER_ID,
      "reachGoal",
      "inquiry_submit",
      { source: "/dlya-optovikov" },
    ],
  ]);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previous,
  });
});
