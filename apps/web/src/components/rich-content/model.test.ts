import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStrapiBlocks } from "./model.ts";

test("maps a CMS h1 to h2 and keeps supported inline marks", () => {
  assert.deepEqual(
    normalizeStrapiBlocks([
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", text: "Происхождение", bold: true }],
      },
    ]),
    [
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", text: "Происхождение", bold: true }],
      },
    ],
  );
});

test("drops executable content and does not preserve unsafe links", () => {
  assert.deepEqual(
    normalizeStrapiBlocks([
      { type: "script", children: [{ type: "text", text: "alert(1)" }] },
      { type: "html", children: [{ type: "text", text: "<img onerror=x>" }] },
      {
        type: "paragraph",
        children: [
          {
            type: "link",
            url: "javascript:alert(1)",
            children: [{ type: "text", text: "небезопасная ссылка" }],
          },
        ],
      },
    ]),
    [
      {
        type: "paragraph",
        children: [{ type: "text", text: "небезопасная ссылка" }],
      },
    ],
  );
});

test("drops empty blocks and images without a usable alt", () => {
  assert.deepEqual(
    normalizeStrapiBlocks([
      { type: "paragraph", children: [{ type: "text", text: "   " }] },
      {
        type: "image",
        image: {
          url: "/uploads/tea.jpg",
          alternativeText: "",
          width: 1200,
          height: 800,
        },
        children: [{ type: "text", text: "" }],
      },
    ]),
    [],
  );
});

test("normalizes a representative Strapi article fixture", () => {
  assert.deepEqual(
    normalizeStrapiBlocks(
      [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Читайте " },
            {
              type: "link",
              url: "https://example.com/tea",
              children: [{ type: "text", text: "историю чая" }],
            },
          ],
        },
        {
          type: "list",
          format: "unordered",
          children: [
            {
              type: "list-item",
              children: [{ type: "text", text: "Прогреть посуду" }],
            },
          ],
        },
        {
          type: "quote",
          children: [{ type: "text", text: "Чай любит внимание." }],
        },
        {
          type: "image",
          imageAlign: "right",
          caption: "Подпись из редактора",
          image: {
            url: "/uploads/tea.jpg",
            alternativeText: "Чайные листья",
            caption: "Старая подпись медиа",
            width: 1200,
            height: 800,
            formats: {
              small: { url: "/uploads/small_tea.jpg", width: 500 },
            },
          },
          children: [{ type: "text", text: "" }],
        },
        { type: "divider" },
      ],
      "https://cms.example.com",
    ),
    [
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Читайте " },
          {
            type: "link",
            href: "https://example.com/tea",
            external: true,
            children: [{ type: "text", text: "историю чая" }],
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        children: [
          {
            type: "list-item",
            children: [{ type: "text", text: "Прогреть посуду" }],
          },
        ],
      },
      {
        type: "quote",
        children: [{ type: "text", text: "Чай любит внимание." }],
      },
      {
        type: "image",
        url: "https://cms.example.com/uploads/tea.jpg",
        alt: "Чайные листья",
        caption: "Подпись из редактора",
        align: "right",
        width: 1200,
        height: 800,
        sources: [
          {
            url: "https://cms.example.com/uploads/small_tea.jpg",
            width: 500,
          },
        ],
      },
      { type: "divider" },
    ],
  );
});

test("normalizes a Better Blocks table and drops malformed rows", () => {
  assert.deepEqual(
    normalizeStrapiBlocks([
      {
        type: "table",
        children: [
          {
            type: "table-row",
            children: [
              {
                type: "table-header-cell",
                children: [{ type: "text", text: "Пролив", bold: true }],
              },
              {
                type: "table-header-cell",
                children: [{ type: "text", text: "Время" }],
              },
            ],
          },
          {
            type: "table-row",
            children: [
              {
                type: "table-cell",
                children: [{ type: "text", text: "Первый" }],
              },
              {
                type: "table-cell",
                children: [{ type: "text", text: "5–10 секунд" }],
              },
            ],
          },
          { type: "paragraph", children: [{ type: "text", text: "нет" }] },
        ],
      },
    ]),
    [
      {
        type: "table",
        rows: [
          {
            cells: [
              {
                header: true,
                children: [{ type: "text", text: "Пролив", bold: true }],
              },
              {
                header: true,
                children: [{ type: "text", text: "Время" }],
              },
            ],
          },
          {
            cells: [
              {
                header: false,
                children: [{ type: "text", text: "Первый" }],
              },
              {
                header: false,
                children: [{ type: "text", text: "5–10 секунд" }],
              },
            ],
          },
        ],
      },
    ],
  );
});
