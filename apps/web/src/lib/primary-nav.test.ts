import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrimaryNavLinks,
  DEFAULT_PRIMARY_NAV_LABELS,
  isPrimaryNavCurrent,
} from "./primary-nav.ts";
import { CAPABILITY_PATH, WHOLESALE_PATH } from "./storefront-routes.ts";

test("puts articles last after wholesale and typical systems", () => {
  const links = buildPrimaryNavLinks(DEFAULT_PRIMARY_NAV_LABELS);

  assert.deepEqual(
    links.map((link) => link.href),
    [
      "/#about",
      "/stantsii",
      "/paneli",
      WHOLESALE_PATH,
      CAPABILITY_PATH,
      "/stati",
    ],
  );
  assert.equal(links.at(-1)?.label, "Статьи");
});

test("marks section routes as current without treating hash links", () => {
  assert.equal(isPrimaryNavCurrent("/#about", "/"), false);
  assert.equal(isPrimaryNavCurrent("/stati", "/stati/rezerv"), true);
  assert.equal(isPrimaryNavCurrent(CAPABILITY_PATH, CAPABILITY_PATH), true);
  assert.equal(isPrimaryNavCurrent(WHOLESALE_PATH, "/stantsii"), false);
});
