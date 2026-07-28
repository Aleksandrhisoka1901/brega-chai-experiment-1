import assert from "node:assert/strict";
import test from "node:test";

import { assertSeedAllowed, planSeed } from "../scripts/seed-helpers.ts";

test("first seed creates fixtures and the next seed updates the same documents", () => {
  const desired = [
    { key: "tea-one", title: "Tea one" },
    { key: "tea-two", title: "Tea two" },
  ];

  const firstRun = planSeed(desired, []);
  assert.deepEqual(
    firstRun.map((operation) => operation.type),
    ["create", "create"],
  );

  const secondRun = planSeed(desired, [
    { key: "tea-one", documentId: "doc-one" },
    { key: "tea-two", documentId: "doc-two" },
  ]);
  assert.deepEqual(
    secondRun.map((operation) => ({
      type: operation.type,
      documentId: operation.documentId,
    })),
    [
      { type: "update", documentId: "doc-one" },
      { type: "update", documentId: "doc-two" },
    ],
  );
});

test("seed requires explicit opt-in and rejects production", () => {
  assert.throws(
    () =>
      assertSeedAllowed({
        NODE_ENV: "development",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai",
      }),
    /SEED_ALLOWED=true/,
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "production",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai",
      }),
    /NODE_ENV=production/,
  );
});

test("seed permits only known local database host and name combinations", () => {
  assert.doesNotThrow(() =>
    assertSeedAllowed({
      SEED_ALLOWED: "true",
      NODE_ENV: "development",
      DATABASE_HOST: "postgres",
      DATABASE_NAME: "brega_chai",
    }),
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "development",
        DATABASE_HOST: "production-db.example.com",
        DATABASE_NAME: "brega_chai",
      }),
    /database host/,
  );
  assert.throws(
    () =>
      assertSeedAllowed({
        SEED_ALLOWED: "true",
        NODE_ENV: "development",
        DATABASE_HOST: "postgres",
        DATABASE_NAME: "brega_chai_production",
      }),
    /database "brega_chai_production"/,
  );
});
