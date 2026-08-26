import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHref,
  parseSafeHtml,
  safeHtmlToText,
} from "./safe-html.ts";

test("keeps editorial markup and drops scripts", () => {
  const nodes = parseSafeHtml(
    '<p>Чай <strong>без спешки</strong></p><script>alert(1)</script><p><a href="https://example.com">ссылка</a></p>',
  );

  assert.deepEqual(nodes, [
    {
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "Чай " },
        {
          type: "element",
          tag: "strong",
          children: [{ type: "text", value: "без спешки" }],
        },
      ],
    },
    {
      type: "element",
      tag: "p",
      children: [
        {
          type: "element",
          tag: "a",
          href: "https://example.com/",
          external: true,
          children: [{ type: "text", value: "ссылка" }],
        },
      ],
    },
  ]);
});

test("rejects javascript and protocol-relative hrefs", () => {
  assert.equal(normalizeHref("javascript:alert(1)"), undefined);
  assert.equal(normalizeHref("//evil.test"), undefined);
  assert.equal(normalizeHref("/stati/tea"), "/stati/tea");
});

test("extracts safe plain text for article excerpts", () => {
  assert.equal(
    safeHtmlToText(
      "<p>Чай <strong>без спешки</strong></p><script>alert(1)</script><p>Продолжение.</p>",
    ),
    "Чай без спешки Продолжение.",
  );
});
