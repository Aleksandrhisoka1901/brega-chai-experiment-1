import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exposes an unauthenticated database readiness probe", async () => {
  const routes = (await import("../src/api/health/routes/health.ts")).default
    .routes;

  assert.deepEqual(routes, [
    {
      method: "GET",
      path: "/health/readiness",
      handler: "health.readiness",
      config: { auth: false },
    },
  ]);

  const controller = await readFile(
    new URL("../src/api/health/controllers/health.ts", import.meta.url),
    "utf8",
  );
  assert.match(controller, /SELECT 1/);
  assert.match(controller, /ctx\.status = 204/);
  assert.match(controller, /ctx\.status = 503/);
});
