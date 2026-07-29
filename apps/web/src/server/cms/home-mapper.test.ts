import assert from "node:assert/strict";
import test from "node:test";

import { mapHomePagePayload } from "./home-mapper.ts";

const image = {
  alt: "Чайная посуда",
  image: { url: "/storefront/hero.png", width: 1200, height: 900 },
};

test("maps editable home sections and resolves media URLs", () => {
  const home = mapHomePagePayload(
    {
      data: {
        hero: {
          title: "Чай как ежедневный ритуал",
          text: "Спокойная чайная практика.",
          layout: "50/50",
          image,
          backgroundColor: "#E8DED0",
          textColor: "#26231F",
          cta: { label: "Выбрать чай", url: "#products" },
        },
        about: {
          text: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Первый абзац." }],
            },
            {
              type: "paragraph",
              children: [{ type: "text", text: "Второй абзац." }],
            },
          ],
          image,
          spacing: "L",
        },
        ritualsPreview: { title: "Ритуалы", subtitle: "Готовые сценарии." },
        productsPreview: { title: "Сорта", subtitle: "Отдельные чаи." },
      },
    },
    "http://localhost:9000",
  );

  assert.equal(
    home.hero.image?.url,
    "http://localhost:9000/storefront/hero.png",
  );
  assert.deepEqual(home.about.paragraphs, ["Первый абзац.", "Второй абзац."]);
  assert.equal(home.hero.cta?.url, "#products");
  assert.equal(home.about.spacing, "L");
});

test("100/0 hero ignores an image and optional CTA", () => {
  const home = mapHomePagePayload(
    {
      data: {
        hero: {
          title: "Текстовый герой",
          text: "Без изображения.",
          layout: "100/0",
          image,
        },
        about: {
          text: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "О проекте." }],
            },
          ],
          backgroundColor: null,
          textColor: null,
          spacing: "M",
        },
        ritualsPreview: { title: "Ритуалы" },
        productsPreview: { title: "Сорта" },
      },
    },
    "http://localhost:9000",
  );

  assert.equal(home.hero.image, undefined);
  assert.equal(home.hero.cta, undefined);
  assert.equal(home.about.backgroundColor, undefined);
  assert.equal(home.about.textColor, undefined);
});
