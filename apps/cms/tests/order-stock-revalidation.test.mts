import assert from "node:assert/strict";
import test from "node:test";

import { runStockMutationWithRevalidation } from "../src/api/order/services/order-stock-revalidation.ts";

test("revalidates product caches only after a successful stock mutation", async () => {
  const calls: string[] = [];
  const result = await runStockMutationWithRevalidation(
    async () => {
      calls.push("mutation");
      return { status: "cancelled" as const };
    },
    {
      send: async (event) => {
        calls.push(`revalidate:${event.event}:${event.action}`);
        return { ok: true as const, eventId: "event-1" };
      },
    },
  );

  assert.deepEqual(result, { status: "cancelled" });
  assert.deepEqual(calls, ["mutation", "revalidate:products:update"]);
});

test("does not revalidate when the stock transaction fails", async () => {
  let revalidations = 0;
  const failure = new Error("transaction failed");

  await assert.rejects(
    runStockMutationWithRevalidation(
      async () => {
        throw failure;
      },
      {
        send: async () => {
          revalidations += 1;
          return { ok: true as const, eventId: "event-1" };
        },
      },
    ),
    failure,
  );
  assert.equal(revalidations, 0);
});

test("does not report a committed mutation as failed when revalidation throws", async () => {
  const warnings: unknown[][] = [];
  const result = await runStockMutationWithRevalidation(
    async () => "committed",
    {
      send: async () => {
        throw new Error("unexpected sender failure");
      },
    },
    { warn: (...args) => warnings.push(args) },
  );

  assert.equal(result, "committed");
  assert.equal(warnings.length, 1);
  assert.equal(
    JSON.stringify(warnings).includes("unexpected sender failure"),
    false,
  );
});
