import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import {
  FALLBACK_CONFORMITY_PAGE,
  conformityPageRequest,
  mapConformityPagePayload,
} from "./conformity-page-mapper.ts";

test("requests the published conformity page with SEO populate", () => {
  const { path, tags } = conformityPageRequest();
  const url = new URL(path, "http://localhost");

  assert.equal(url.pathname, "/api/conformity-page");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("fields[0]"), "title");
  assert.equal(url.searchParams.get("fields[2]"), "content");
  assert.equal(url.searchParams.get("populate[seo][fields][0]"), "title");
  assert.deepEqual(tags, ["conformity-page"]);
});

test("maps Better Blocks copy and keeps a mailto link", () => {
  const page = mapConformityPagePayload(
    {
      data: {
        title: "Декларация соответствия",
        eyebrow: "Правовая информация",
        content: [
          {
            type: "paragraph",
            children: [
              { type: "text", text: "Оборудование сопровождается декларацией." },
            ],
          },
          {
            type: "paragraph",
            children: [
              { type: "text", text: "Скан по запросу на " },
              {
                type: "link",
                url: "mailto:hello@lon-energy.ru",
                children: [{ type: "text", text: "hello@lon-energy.ru" }],
              },
              { type: "text", text: "." },
            ],
          },
        ],
        seo: {
          title: "Декларация соответствия — Voltora",
          description: "Документ по запросу.",
        },
      },
    },
    "http://localhost:9000",
  );

  assert.equal(page?.title, "Декларация соответствия");
  assert.equal(page?.eyebrow, "Правовая информация");
  assert.equal(page?.content[1]?.type, "paragraph");
  if (page?.content[1]?.type === "paragraph") {
    const link = page.content[1].children.find((node) => node.type === "link");
    assert.equal(link?.type, "link");
    if (link?.type === "link") {
      assert.equal(link.href, "mailto:hello@lon-energy.ru");
      assert.equal(link.external, false);
    }
  }
  assert.equal(page?.seo?.title, "Декларация соответствия — Voltora");
  assert.equal(
    mapConformityPagePayload({ data: null }, "http://localhost:9000"),
    null,
  );
  assert.throws(
    () => mapConformityPagePayload({ data: {} }, "http://localhost:9000"),
    CmsValidationError,
  );
});

test("fallback copy keeps the current public wording", () => {
  assert.equal(FALLBACK_CONFORMITY_PAGE.title, "Декларация соответствия");
  assert.equal(FALLBACK_CONFORMITY_PAGE.eyebrow, "Правовая информация");
  assert.equal(FALLBACK_CONFORMITY_PAGE.content.length, 2);
});
