import assert from "node:assert/strict";
import test from "node:test";

import { validateUniqueBreadcrumbRoutes } from "../src/api/global-setting/content-types/global-setting/validation.ts";

test("accepts one breadcrumb label per configured route", () => {
  assert.doesNotThrow(() =>
    validateUniqueBreadcrumbRoutes([
      { route: "tovary", label: "Сорта" },
      { route: "nabory", label: "Ритуалы" },
    ]),
  );
});

test("rejects duplicate breadcrumb routes with an editor-facing message", () => {
  assert.throws(
    () =>
      validateUniqueBreadcrumbRoutes([
        { route: "tovary", label: "Сорта" },
        { route: "tovary", label: "Каталог" },
      ]),
    /Для раздела «Товары» уже задан лейбл/,
  );
});

test("allows omitted breadcrumb settings because the storefront has fallbacks", () => {
  assert.doesNotThrow(() => validateUniqueBreadcrumbRoutes(undefined));
});
