import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONFORMITY_PAGE,
  CONFORMITY_PAGE_PERMISSION_ACTION,
  ensureConformityPageConfiguration,
} from "../src/conformity-page-configuration.ts";

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
      assert.equal(uid, "api::conformity-page.conformity-page");
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
                  ? [{ action: CONFORMITY_PAGE_PERMISSION_ACTION }]
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

test("creates only the missing conformity page and its public find permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness();

  await ensureConformityPageConfiguration(strapi);

  assert.deepEqual(pageCreates, [
    { data: DEFAULT_CONFORMITY_PAGE, status: "published" },
  ]);
  assert.deepEqual(permissionCreates, [
    { data: { action: CONFORMITY_PAGE_PERMISSION_ACTION, role: 2 } },
  ]);
});

test("preserves editor-managed conformity content and an existing permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness({
    existingPage: { documentId: "conformity-page" },
    hasPermission: true,
  });

  await ensureConformityPageConfiguration(strapi);

  assert.deepEqual(pageCreates, []);
  assert.deepEqual(permissionCreates, []);
});
