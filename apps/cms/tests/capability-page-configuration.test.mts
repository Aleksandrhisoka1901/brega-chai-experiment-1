import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPABILITY_PAGE_PERMISSION_ACTION,
  DEFAULT_CAPABILITY_PAGE,
  ensureCapabilityPageConfiguration,
} from "../src/capability-page-configuration.ts";

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
      assert.equal(uid, "api::capability-page.capability-page");
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
                  ? [{ action: CAPABILITY_PAGE_PERMISSION_ACTION }]
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

test("creates only the missing capability page and its public find permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness();

  await ensureCapabilityPageConfiguration(strapi);

  assert.deepEqual(pageCreates, [
    { data: DEFAULT_CAPABILITY_PAGE, status: "published" },
  ]);
  assert.deepEqual(permissionCreates, [
    { data: { action: CAPABILITY_PAGE_PERMISSION_ACTION, role: 2 } },
  ]);
  assert.equal(DEFAULT_CAPABILITY_PAGE.models.length, 4);
  assert.equal(DEFAULT_CAPABILITY_PAGE.specRows.length > 10, true);
});

test("preserves editor-managed capability content and an existing permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness({
    existingPage: { documentId: "capability-page" },
    hasPermission: true,
  });

  await ensureCapabilityPageConfiguration(strapi);

  assert.deepEqual(pageCreates, []);
  assert.deepEqual(permissionCreates, []);
});
