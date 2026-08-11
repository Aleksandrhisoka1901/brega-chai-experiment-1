import assert from "node:assert/strict";
import test from "node:test";

import {
  mapHomeCollectionsPayload,
  mapHomePagePayload,
} from "./home-mapper.ts";

const image = {
  alt: "Чайная посуда",
  image: {
    url: "/storefront/hero.png",
    width: 1200,
    height: 900,
    formats: {
      small: { url: "/storefront/small_hero.png", width: 500 },
    },
  },
};

test("maps editable home sections and resolves media URLs", () => {
  const home = mapHomePagePayload(
    {
      data: {
        hero: {
          eyebrow: "Чай как личная практика",
          title: "Чай как ежедневный ритуал",
          text: "Спокойная чайная практика.",
          layout: "50/50",
          image,
          backgroundColor: "#E8DED0",
          textColor: "#26231F",
          cta: { label: "Выбрать чай", url: "#tovary" },
        },
        about: {
          eyebrow: "Глава 01 · О проекте",
          title: "Первый абзац.",
          textBlock1: "Второй абзац.",
          textBlock2: null,
          spacing: "L",
        },
        naboryPreview: {
          eyebrow: "Глава 02",
          title: "Ритуалы",
          subtitle: "Готовые сценарии.",
        },
        tovaryPreview: {
          eyebrow: "Глава 03",
          title: "Сорта",
          subtitle: "Отдельные чаи.",
          linkLabel: "Все сорта",
        },
        seo: {
          title: "Чайный бутик",
          description: "Главная страница чайного бутика.",
        },
      },
    },
    "http://localhost:9000",
  );

  assert.equal(
    home.hero.image?.url,
    "http://localhost:9000/storefront/hero.png",
  );
  assert.deepEqual(home.hero.image?.sources, [
    { url: "http://localhost:9000/storefront/small_hero.png", width: 500 },
  ]);
  assert.deepEqual(home.about.textBlocks, ["Второй абзац."]);
  assert.equal(home.about.title, "Первый абзац.");
  assert.equal(home.hero.cta?.url, "#tovary");
  assert.equal(home.tovaryPreview.linkLabel, "Все сорта");
  assert.equal(home.about.spacing, "L");
  assert.equal(home.seo?.title, "Чайный бутик");
});

test("100/0 hero ignores an image and optional CTA", () => {
  const home = mapHomePagePayload(
    {
      data: {
        hero: {
          eyebrow: "Вступление",
          title: "Текстовый герой",
          text: "Без изображения.",
          layout: "100/0",
          image,
        },
        about: {
          eyebrow: "О проекте",
          title: "О проекте.",
          textBlock1: null,
          textBlock2: "Единственный заполненный блок.",
          backgroundColor: null,
          textColor: null,
          spacing: "M",
        },
        naboryPreview: { eyebrow: "02", title: "Ритуалы" },
        tovaryPreview: {
          eyebrow: "03",
          title: "Сорта",
          linkLabel: "Все сорта",
        },
      },
    },
    "http://localhost:9000",
  );

  assert.equal(home.hero.image, undefined);
  assert.equal(home.hero.cta, undefined);
  assert.equal(home.hero.backgroundColor, "#AFB094");
  assert.equal(home.hero.textColor, "#24251E");
  assert.equal(home.about.backgroundColor, undefined);
  assert.equal(home.about.textColor, undefined);
  assert.deepEqual(home.about.textBlocks, ["Единственный заполненный блок."]);
});

test("maps curated home collections in the order returned by Strapi", () => {
  const record = (documentId: string, title: string, type: string) => ({
    documentId,
    slug: `${documentId}-slug`,
    type,
    title: `${type === "nabor" ? "Ритуал" : "Сорт"}: ${title}`,
    displayName: title,
    packageLabel: "Пакетик (50 г)",
    price: 1200,
    stock: 2,
    cardExcerpt: `${title}: краткий анонс.`,
  });
  const collections = mapHomeCollectionsPayload(
    {
      data: {
        featuredNabory: [
          record("nabor-2", "Второй ритуал", "nabor"),
          record("nabor-1", "Первый ритуал", "nabor"),
        ],
        featuredTovary: [
          record("tovar-2", "Второй сорт", "tovar"),
          record("tovar-1", "Первый сорт", "tovar"),
        ],
      },
    },
    "http://localhost:9000",
  );

  assert.deepEqual(
    collections.nabory.map(({ id }) => id),
    ["nabor-2", "nabor-1"],
  );
  assert.deepEqual(
    collections.tovary.map(({ id }) => id),
    ["tovar-2", "tovar-1"],
  );
});
