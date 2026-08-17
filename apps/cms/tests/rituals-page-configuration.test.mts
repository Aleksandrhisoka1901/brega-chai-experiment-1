import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RITUALS_PAGE,
  RITUALS_PAGE_PERMISSION_ACTION,
  ensureRitualsPageConfiguration,
} from "../src/rituals-page-configuration.ts";

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
      assert.equal(uid, "api::rituals-page.rituals-page");
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
                  ? [{ action: RITUALS_PAGE_PERMISSION_ACTION }]
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

test("creates only the missing rituals landing and its narrow public permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness();

  await ensureRitualsPageConfiguration(strapi);

  assert.deepEqual(pageCreates, [
    { data: DEFAULT_RITUALS_PAGE, status: "published" },
  ]);
  assert.deepEqual(permissionCreates, [
    { data: { action: RITUALS_PAGE_PERMISSION_ACTION, role: 2 } },
  ]);
});

test("preserves editor-managed rituals content and an existing permission", async () => {
  const { pageCreates, permissionCreates, strapi } = harness({
    existingPage: { documentId: "rituals-page" },
    hasPermission: true,
  });

  await ensureRitualsPageConfiguration(strapi);

  assert.deepEqual(pageCreates, []);
  assert.deepEqual(permissionCreates, []);
});
