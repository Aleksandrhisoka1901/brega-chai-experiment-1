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
  assert.equal(url.searchParams.get("fields[3]"), "content");
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
      "populate[blocks][on][article.cards-grid][populate][cards][populate][image][fields][0]",
    ),
    "url",
  );
  assert.equal(
    url.searchParams.get(
      "populate[blocks][on][material-templates.cards-grid][populate][cards][populate][bullet_icon][fields][0]",
    ),
    "url",
  );
  assert.equal(
    url.searchParams.has(
      "populate[blocks][populate][cards][populate][image][fields][0]",
    ),
    false,
  );
  assert.equal(
    url.searchParams.get(
      "populate[relatedMaterials][on][article.related-product][populate][product][fields][0]",
    ),
    "displayName",
  );
  assert.equal(
    url.searchParams.get(
      "populate[relatedMaterials][on][article.related-article][populate][article][populate][image][fields][0]",
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
            content: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Краткое содержание." }],
              },
            ],
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
        content: "<p>Краткое содержание.</p>",
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
  assert.equal(
    article?.content,
    "<p>Пауза важнее глотка.</p><script>alert(1)</script>",
  );
  assert.equal(article?.blocks[0]?.gridColumns, 3);
  assert.equal(article?.blocks[0]?.cards[0]?.title, "Вода");
  assert.equal(article?.blocks[0]?.cards[0]?.bulletText, "01");
  assert.equal(
    mapArticleDetailPayload({ data: [] }, "http://localhost:9000"),
    null,
  );
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
  assert.equal(
    article?.blocks[0]?.cards[0]?.description,
    "<p>Меньше листьев.</p>",
  );
  assert.equal(article?.blocks[0]?.cards[0]?.bgColor, "#f7f4ec");
});

test("maps related products, rituals, and articles in author order", () => {
  const article = mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "source",
          name: "Чайный вечер",
          slug: "chajnyj-vecher",
          relatedMaterials: [
            {
              __component: "article.related-product",
              product: {
                documentId: "product-1",
                displayName: "Да Хун Пао",
                slug: "da-hun-pao",
                cardExcerpt: "Тёмный улун с глубоким ароматом.",
                type: "tovar",
                mainImage: {
                  alt: "Чай Да Хун Пао",
                  image: {
                    url: "/uploads/tea.jpg",
                    width: 800,
                    height: 600,
                    updatedAt: "2026-08-27T10:00:00.000Z",
                  },
                },
              },
            },
            {
              __component: "article.related-product",
              product: {
                documentId: "ritual-1",
                displayName: "Утро без слов",
                slug: "utro-bez-slov",
                cardExcerpt: "Готовый ритуал для спокойного утра.",
                type: "nabor",
              },
            },
            {
              __component: "article.related-article",
              article: {
                documentId: "article-2",
                name: "Температура воды",
                slug: "temperatura-vody",
                content: [
                  {
                    type: "paragraph",
                    children: [
                      { type: "text", text: "Как не перегреть зелёный чай." },
                    ],
                  },
                ],
                image: {
                  url: "/uploads/water.jpg",
                  alternativeText: "Чайник",
                },
              },
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(
    article?.relatedMaterials.map(({ type, id, slug, name, description }) => ({
      type,
      id,
      slug,
      name,
      description,
    })),
    [
      {
        type: "product",
        id: "product-1",
        slug: "da-hun-pao",
        name: "Да Хун Пао",
        description: "Тёмный улун с глубоким ароматом.",
      },
      {
        type: "ritual",
        id: "ritual-1",
        slug: "utro-bez-slov",
        name: "Утро без слов",
        description: "Готовый ритуал для спокойного утра.",
      },
      {
        type: "article",
        id: "article-2",
        slug: "temperatura-vody",
        name: "Температура воды",
        description: "Как не перегреть зелёный чай.",
      },
    ],
  );
  assert.equal(article?.relatedMaterials[0]?.image?.alt, "Чай Да Хун Пао");
  assert.equal(article?.relatedMaterials[2]?.image?.alt, "Чайник");
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

test("preserves every grid card and lets default positions auto-flow", () => {
  const article = mapArticleDetailPayload(
    {
      data: [
        {
          documentId: "a4",
          name: "Три карточки",
          slug: "tri-kartochki",
          blocks: [
            {
              __component: "article.cards-grid",
              gridColumns: 3,
              cards: [
                { title: "Первая", gridColumnsStart: 1, gridRowsStart: 1 },
                { title: "Вторая", gridColumnsStart: 1, gridRowsStart: 1 },
                { title: "Третья", gridColumnsStart: 1, gridRowsStart: 1 },
              ],
            },
          ],
        },
      ],
    },
    "http://localhost:9000",
  );

  assert.deepEqual(
    article?.blocks[0]?.cards.map((card) => card.title),
    ["Первая", "Вторая", "Третья"],
  );
  assert.equal(article?.blocks[0]?.cards[0]?.gridColumnsStart, undefined);
  assert.equal(article?.blocks[0]?.cards[1]?.gridRowsStart, undefined);
});
