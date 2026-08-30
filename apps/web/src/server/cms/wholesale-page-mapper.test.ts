import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import {
  mapWholesalePagePayload,
  wholesalePageRequest,
} from "./wholesale-page-mapper.ts";

test("requests published wholesale page with cards-grid populate", () => {
  const { path, tags } = wholesalePageRequest();
  const url = new URL(path, "http://localhost");

  assert.equal(url.pathname, "/api/wholesale-page");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("fields[0]"), "title");
  assert.equal(
    url.searchParams.get(
      "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][0]",
    ),
    "url",
  );
  assert.deepEqual(tags, ["wholesale-page"]);
});

test("maps wholesale title, body and cards-grid like an article", () => {
  const page = mapWholesalePagePayload(
    {
      data: {
        title: "Для оптовиков",
        content: "<p>Партии под заказ.</p>",
        blocks: [
          {
            __component: "article.cards-grid",
            title: "Условия",
            gridColumns: 2,
            cards: [{ title: "Партия", titleHtmlTag: "h3" }],
          },
        ],
      },
    },
    "http://localhost:9000",
  );

  assert.equal(page?.name, "Для оптовиков");
  assert.equal(page?.slug, "dlya-optovikov");
  assert.equal(page?.content, "<p>Партии под заказ.</p>");
  assert.equal(page?.blocks[0]?.cards[0]?.title, "Партия");
  assert.equal(
    mapWholesalePagePayload({ data: null }, "http://localhost:9000"),
    null,
  );
  assert.throws(
    () => mapWholesalePagePayload({ data: {} }, "http://localhost:9000"),
    CmsValidationError,
  );
});
