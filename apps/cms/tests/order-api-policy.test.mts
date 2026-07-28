import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path: string) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("order has a unique private idempotency key and immutable snapshots", async () => {
  const schema = await readJson(
    "../src/api/order/content-types/order/schema.json",
  );

  assert.equal(schema.options.draftAndPublish, false);
  assert.equal(schema.attributes.status, undefined);
  assert.deepEqual(schema.attributes.orderStatus.enum, [
    "new",
    "confirmed",
    "completed",
    "cancelled",
  ]);
  assert.equal(schema.attributes.idempotencyKey.unique, true);
  assert.equal(schema.attributes.idempotencyKey.private, true);
  assert.equal(schema.attributes.requestFingerprint.private, true);
  assert.equal(schema.attributes.lines.type, "json");
  assert.equal(schema.attributes.totalRubles.type, "integer");
  assert.deepEqual(schema.attributes.currency.enum, ["RUB"]);
});

test("order API exposes only the protected create route", async () => {
  const routes = (await import("../src/api/order/routes/order.ts")).default
    .routes;

  assert.deepEqual(
    routes.map(({ method, path, handler }) => ({ method, path, handler })),
    [{ method: "POST", path: "/orders", handler: "order.create" }],
  );
  assert.deepEqual(routes[0].config.auth, {
    scope: ["api::order.order.create"],
  });
});
