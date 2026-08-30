import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WHOLESALE_PAGE,
  WHOLESALE_PAGE_PERMISSION_ACTION,
  ensureWholesalePageConfiguration,
} from "../src/wholesale-page-configuration.ts";

function harness({
  existingPage = null,
  hasPermission = false,
}: {
  existingPage?: { documentId: string } | null;
  hasPermission?: boolean;
} = {}) {
  const pageCreates: unknown[] = [];
  const permissionCreates: unknown[] = [];
  const strapi = {
    documents(uid: string) {
      assert.equal(uid, "api::wholesale-page.wholesale-page");
      return {
        async findFirst() {
          return existingPage;
        },
        async create(input: unknown) {
          pageCreates.push(input);
        },
      };
    },
    db: {
      query(uid: string) {
        if (uid === "plugin::users-permissions.role") {
          return {
            async findOne() {
              return {
                id: 2,
                permissions: hasPermission
                  ? [{ action: WHOLESALE_PAGE_PERMISSION_ACTION }]
                  : [],
              };
            },
          };
        }
        assert.equal(uid, "plugin::users-permissions.permission");
        return {
          async create(input: unknown) {
            permissionCreates.push(input);
          },
        };
      },
    },
  };

  return { pageCreates, permissionCreates, strapi };
}

test("creates only the missing wholesale page and its public find permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness();

  await ensureWholesalePageConfiguration(strapi);

  assert.deepEqual(pageCreates, [
    { data: DEFAULT_WHOLESALE_PAGE, status: "published" },
  ]);
  assert.deepEqual(permissionCreates, [
    { data: { action: WHOLESALE_PAGE_PERMISSION_ACTION, role: 2 } },
  ]);
});

test("preserves editor-managed wholesale content and an existing permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness({
    existingPage: { documentId: "wholesale-page" },
    hasPermission: true,
  });

  await ensureWholesalePageConfiguration(strapi);

  assert.deepEqual(pageCreates, []);
  assert.deepEqual(permissionCreates, []);
});
