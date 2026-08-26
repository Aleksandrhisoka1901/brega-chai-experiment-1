import assert from "node:assert/strict";
import test from "node:test";

import { CmsValidationError } from "./errors.ts";
import {
  articleDetailRequest,
  articlesListRequest,
  mapArticleDetailPayload,
  mapArticlesPayload,
} from "./article-mapper.ts";

test("lists articles with a narrow published populate and articles tag", () => {
  const { path, tags } = articlesListRequest();
  const url = new URL(path, "http://localhost");

  assert.equal(url.pathname, "/api/articles");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("fields[0]"), "name");
  assert.equal(url.searchParams.get("fields[1]"), "slug");
  assert.equal(url.searchParams.get("fields[2]"), "priority");
  assert.equal(url.searchParams.has("fields[3]"), false);
  assert.equal(url.searchParams.get("sort[0]"), "priority:desc");
  assert.deepEqual(tags, ["articles"]);
});

test("details request populates blocks and tags the slug cache", () => {
  const { path, tags } = articleDetailRequest("tihij-stol");
  const url = new URL(path, "http://localhost");

  assert.equal(url.searchParams.get("filters[slug][$eq]"), "tihij-stol");
  assert.equal(url.searchParams.get("fields[3]"), "content");
  assert.equal(
    url.searchParams.get(
      "populate[blocks][populate][cards][populate][image][fields][0]",
    ),
    "url",
  );
  assert.deepEqual(tags, ["articles", "article-slug:tihij-stol"]);
});

test("maps listing records without document attributes or blocks", () => {
  assert.deepEqual(
    mapArticlesPayload(
      {
        data: [
          {
            documentId: "a1",
            name: "Тихий стол",
            slug: "tihij-stol",
            priority: 10,
            image: {
              url: "/uploads/table.png",
              width: 800,
              height: 500,
              alternativeText: "Стол",
              updatedAt: "2026-08-16T12:00:00.000Z",
            },
          },
        ],
      },
      "http://localhost:9000",
    ),
    [
      {
        id: "a1",
        name: "Тихий стол",
        slug: "tihij-stol",
        priority: 10,
        image: {
          url: "http://localhost:9000/uploads/table.png?v=2026-08-16T12%3A00%3A00.000Z",
          alt: "Стол",
          width: 800,
          height: 500,
          sources: [],
        },
      },
    ],
  );
});

test("maps a detail article with cards-grid and returns null for misses", () => {
  const article = mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "a1",
          name: "Тихий стол",
          slug: "tihij-stol",
          content: "<p>Пауза важнее глотка.</p><script>alert(1)</script>",
          blocks: [
            {
              __component: "article.cards-grid",
              title: "Опоры",
              gridColumns: 3,
              cards: [
                {
                  title: "Вода",
                  titleHtmlTag: "h3",
                  description: "<p>Свежая.</p>",
                  bgColor: "#f7f4ec",
                  bulletText: "01",
                },
              ],
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.equal(article?.name, "Тихий стол");
  assert.equal(article?.content, "<p>Пауза важнее глотка.</p><script>alert(1)</script>");
  assert.equal(article?.blocks[0]?.gridColumns, 3);
  assert.equal(article?.blocks[0]?.cards[0]?.title, "Вода");
  assert.equal(article?.blocks[0]?.cards[0]?.bulletText, "01");
  assert.equal(mapArticleDetailPayload({ data: [] }, "http://localhost:9000"), null);
  assert.throws(
    () => mapArticleDetailPayload({ data: {} }, "http://localhost:9000"),
    CmsValidationError,
  );
});

test("maps rich-text content arrays and loose dynamic-zone blocks", () => {
  const article = mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "a2",
          name: "Заваривание",
          slug: "zavarivanie",
          content: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Вода почти кипит." }],
            },
            {
              type: "heading",
              level: 2,
              children: [{ type: "text", text: "Пауза", bold: true }],
            },
          ],
          blocks: [
            {
              __component: "article.unknown-block",
              heading: "skip me",
            },
            {
              __component: "article.cards-grid",
              title: "Карточки",
              extraCmsField: true,
              titleColor: { hex: "#3a2f23" },
              cards: [
                {
                  title: "Гайвань",
                  description: [
                    {
                      type: "paragraph",
                      children: [{ type: "text", text: "Меньше листьев." }],
                    },
                  ],
                  bgColor: { hex: "#f7f4ec" },
                },
              ],
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.equal(
    article?.content,
    "<p>Вода почти кипит.</p><h2><strong>Пауза</strong></h2>",
  );
  assert.equal(article?.blocks.length, 1);
  assert.equal(article?.blocks[0]?.title, "Карточки");
  assert.equal(article?.blocks[0]?.titleColor, "#3a2f23");
  assert.equal(article?.blocks[0]?.cards[0]?.description, "<p>Меньше листьев.</p>");
  assert.equal(article?.blocks[0]?.cards[0]?.bgColor, "#f7f4ec");
});

test("maps snake_case CardsGrid / BasicInfoCard fields from Strapi", () => {
  const article = mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "a3",
          name: "Памятка",
          slug: "pamyatka",
          blocks: [
            {
              __component: "material-templates.cards-grid",
              title: [
                {
                  type: "paragraph",
                  children: [{ type: "text", text: "Какие схемы чаще всего?" }],
                },
              ],
              title_color: "#3a2f23",
              grid_columns: 2,
              cards: [
                {
                  title: "Манипуляции",
                  title_html_tag: "h3",
                  description: "<p><strong>Суть схемы:</strong> перевод.</p>",
                  bg_color: "#ffffff",
                  bullet_text: "1",
                  bullet_bg_color: "#c45c4a",
                  bullet_text_color: "#ffffff",
                  bullet_position: "left",
                },
              ],
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.equal(article?.blocks[0]?.title, "<p>Какие схемы чаще всего?</p>");
  assert.equal(article?.blocks[0]?.titleColor, "#3a2f23");
  assert.equal(article?.blocks[0]?.gridColumns, 2);
  assert.equal(article?.blocks[0]?.cards[0]?.bulletText, "1");
  assert.equal(article?.blocks[0]?.cards[0]?.bgColor, "#ffffff");
  assert.equal(article?.blocks[0]?.cards[0]?.bulletBgColor, "#c45c4a");
});
