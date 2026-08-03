"use strict";

const FALLBACK_SLUG = "item";

const CATALOG_STORAGE = Object.freeze({
  homePageComponentIdColumn: "cmp_id",
  featuredNabory: Object.freeze({
    legacy: "home_pages_featured_rituals_lnk",
    current: "home_pages_featured_nabory_lnk",
  }),
  featuredTovary: Object.freeze({
    legacy: "home_pages_featured_products_lnk",
    current: "home_pages_featured_tovary_lnk",
  }),
});

function normalizeSlugBase(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180)
      .replace(/-+$/g, "") || FALLBACK_SLUG
  );
}

function migratedType(value) {
  return value === "ritual" || value === "nabor" ? "nabor" : "tovar";
}

function defaultCategoryLabel(value) {
  return migratedType(value) === "nabor" ? "чайный ритуал" : "сорт чая";
}

function productDisplayName(title) {
  return String(title || "")
    .replace(/^(?:Ритуал|Сорт):\s*/u, "")
    .trim();
}

function technicalProductTitle(displayName, type) {
  const prefix = migratedType(type) === "nabor" ? "Ритуал" : "Сорт";
  return `${prefix}: ${productDisplayName(displayName)}`;
}

function uniqueSlug(base, used) {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${base.slice(0, 180 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }

  throw new Error("Could not migrate catalog slugs without a collision");
}

function buildCatalogRecords(rows, transliterate) {
  const documents = new Map();
  for (const row of rows) {
    const key = row.document_id || `row-${row.id}`;
    const document = documents.get(key);
    if (document) {
      document.ids.push(row.id);
      if (!document.categoryLabel && row.category_label) {
        document.categoryLabel = row.category_label;
      }
      continue;
    }

    documents.set(key, {
      ids: [row.id],
      title: row.title || "",
      sourceType: row.type,
      categoryLabel: row.category_label || null,
    });
  }

  const used = new Set();
  return [...documents.values()].map((document) => ({
    ids: document.ids,
    slug: uniqueSlug(normalizeSlugBase(transliterate(document.title)), used),
    type: migratedType(document.sourceType),
    categoryLabel:
      document.categoryLabel || defaultCategoryLabel(document.sourceType),
  }));
}

function blockText(block) {
  if (!block || !Array.isArray(block.children)) return "";
  return block.children
    .map((child) => (typeof child?.text === "string" ? child.text : ""))
    .join("")
    .trim();
}

function extractAboutFields(blocks) {
  const paragraphs = Array.isArray(blocks)
    ? blocks.map(blockText).filter(Boolean)
    : [];

  return {
    title:
      paragraphs[0] || "Вещи обретают смысл, когда становятся частью привычки.",
    textBlock1: paragraphs[1] || null,
    textBlock2: paragraphs[2] || null,
  };
}

function nestedText(value) {
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (!Array.isArray(value.children)) return "";

  return value.children.map(nestedText).join("");
}

function blocksToPlainText(value) {
  let blocks = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[")) return trimmed;

    try {
      blocks = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  if (!Array.isArray(blocks)) return "";

  return blocks
    .map(nestedText)
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function migratePublicUrl(value) {
  if (typeof value !== "string") return null;

  const replacements = [
    ["/#rituals", "/#nabory"],
    ["/#products", "/#tovary"],
    ["#rituals", "#nabory"],
    ["#products", "#tovary"],
    ["/rituals", "/nabory"],
    ["/products", "/tovary"],
  ];

  for (const [source, target] of replacements) {
    if (
      value === source ||
      value.startsWith(`${source}/`) ||
      value.startsWith(`${source}?`)
    ) {
      return `${target}${value.slice(source.length)}`;
    }
  }

  return null;
}

module.exports = {
  blocksToPlainText,
  buildCatalogRecords,
  CATALOG_STORAGE,
  extractAboutFields,
  migratePublicUrl,
  normalizeSlugBase,
  productDisplayName,
  technicalProductTitle,
};
