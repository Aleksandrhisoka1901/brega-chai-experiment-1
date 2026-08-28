import assert from "node:assert/strict";
import test from "node:test";

import { validateUniqueBreadcrumbRoutes } from "../src/api/global-setting/content-types/global-setting/validation.ts";

test("accepts one breadcrumb label per configured route", () => {
  assert.doesNotThrow(() =>
    validateUniqueBreadcrumbRoutes([
      { route: "stantsii", label: "Электростанции" },
      { route: "paneli", label: "Солнечные панели" },
    ]),
  );
});

test("rejects duplicate breadcrumb routes with an editor-facing message", () => {
  assert.throws(
    () =>
      validateUniqueBreadcrumbRoutes([
        { route: "stantsii", label: "Электростанции" },
        { route: "stantsii", label: "Каталог" },
      ]),
    /Для раздела «Электростанции» уже задан лейбл/,
  );
});

test("allows omitted breadcrumb settings because the storefront has fallbacks", () => {
  assert.doesNotThrow(() => validateUniqueBreadcrumbRoutes(undefined));
});
