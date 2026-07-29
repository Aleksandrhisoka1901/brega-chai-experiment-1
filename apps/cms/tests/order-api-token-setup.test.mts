import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLocalOrTestEnvironment,
  emitAccessKey,
  ensureOrderCreateToken,
  ORDER_CREATE_PERMISSION,
  type ContentApiTokenService,
} from "../scripts/order-api-token-helpers.ts";

function serviceStub(
  overrides: Partial<ContentApiTokenService> = {},
): ContentApiTokenService {
  return {
    async getByName() {
      return null;
    },
    async create() {
      return { id: 1, accessKey: "new-token" };
    },
    async update() {},
    ...overrides,
  };
}

test("creates a custom token with only the order create permission", async () => {
  const calls: unknown[] = [];
  const service = serviceStub({
    async create(attributes) {
      calls.push(attributes);
      return { id: 1, accessKey: "ephemeral-token" };
    },
  });

  assert.equal(
    await ensureOrderCreateToken(service, "test-order-create"),
    "ephemeral-token",
  );
  assert.deepEqual(calls, [
    {
      name: "test-order-create",
      description: "Local/test token for private order creation",
      type: "custom",
      permissions: [ORDER_CREATE_PERMISSION],
      lifespan: null,
    },
  ]);
});

test("reuses the named token without creating or updating it", async () => {
  let writes = 0;
  const service = serviceStub({
    async getByName(name, options) {
      assert.equal(name, "local-order-create");
      assert.deepEqual(options, { includeDecryptedKey: true });
      return {
        id: 7,
        accessKey: "existing-token",
        type: "custom",
        permissions: [ORDER_CREATE_PERMISSION],
      };
    },
    async create() {
      writes += 1;
      return { id: 1 };
    },
    async update() {
      writes += 1;
    },
  });

  assert.equal(await ensureOrderCreateToken(service), "existing-token");
  assert.equal(writes, 0);
});

test("repairs a named token that has broader permissions", async () => {
  const updates: unknown[] = [];
  const service = serviceStub({
    async getByName() {
      return {
        id: 9,
        accessKey: "reconciled-token",
        type: "full-access",
        permissions: [],
      };
    },
    async update(id, attributes) {
      updates.push({ id, attributes });
    },
  });

  assert.equal(await ensureOrderCreateToken(service), "reconciled-token");
  assert.deepEqual(updates, [
    {
      id: 9,
      attributes: {
        type: "custom",
        permissions: [ORDER_CREATE_PERMISSION],
      },
    },
  ]);
});

test("refuses production and requires Strapi to return a token", async () => {
  assert.doesNotThrow(() => assertLocalOrTestEnvironment(undefined));
  assert.doesNotThrow(() => assertLocalOrTestEnvironment("test"));
  assert.throws(
    () => assertLocalOrTestEnvironment("production"),
    /restricted to development\/test/,
  );
  await assert.rejects(
    ensureOrderCreateToken(
      serviceStub({
        async create() {
          return { id: 1 };
        },
      }),
    ),
    /decryptable API token/,
  );
});

test("captures a token in a private file without mixing it with stdout logs", async () => {
  const writes: unknown[] = [];
  const stdout: string[] = [];

  await emitAccessKey("scoped-token", "/tmp/order-token", {
    async writeFile(path, data, options) {
      writes.push({ path, data, options });
    },
    writeStdout(data) {
      stdout.push(data);
    },
  });

  assert.deepEqual(writes, [
    {
      path: "/tmp/order-token",
      data: "scoped-token",
      options: { mode: 0o600 },
    },
  ]);
  assert.deepEqual(stdout, []);
});
