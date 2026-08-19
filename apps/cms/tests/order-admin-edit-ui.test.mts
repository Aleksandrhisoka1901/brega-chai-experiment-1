import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL(
    "../src/plugins/order-admin/admin/src/OrderEditModal.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("order edit modal uses the approved wide layout", () => {
  assert.match(source, /width:\s*min\(96vw, 90rem\)/);
  assert.match(source, /max-width:\s*90rem/);
});

test("order edit quantity hint is concise and does not affect input alignment", () => {
  assert.match(source, /Доступно:/);
  assert.match(source, /position:\s*absolute/);
  assert.match(source, /padding-bottom:[^;]*theme\.spaces\[7\]/);
  assert.match(
    source,
    /td:first-of-type[^}]*padding-top:[^;]*theme\.spaces\[4\]/s,
  );
});

test("product picker supports title search through the native combobox", () => {
  assert.match(source, /<Combobox\b/);
  assert.match(source, /<ComboboxOption\b/);
  assert.doesNotMatch(source, /<SingleSelect\b/);
});
