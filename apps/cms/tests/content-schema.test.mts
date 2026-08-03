import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function schema(path: string) {
  return JSON.parse(
    await readFile(new URL(`../${path}`, import.meta.url), "utf8"),
  ) as {
    options?: { draftAndPublish?: boolean };
    attributes: Record<string, Record<string, unknown>>;
  };
}

test("product schema enforces price, stock, currency and publication constraints", async () => {
  const product = await schema(
    "src/api/product/content-types/product/schema.json",
  );

  assert.equal(product.options?.draftAndPublish, true);
  assert.equal(product.attributes.title.required, true);
  assert.equal(product.attributes.displayName.required, true);
  assert.deepEqual(product.attributes.type.enum, ["nabor", "tovar"]);
  assert.equal(product.attributes.breadcrumbLabel.required, false);
  assert.equal(product.attributes.categoryLabel.required, false);
  assert.equal(product.attributes.price.type, "integer");
  assert.equal(product.attributes.price.required, true);
  assert.equal(product.attributes.price.min, 1);
  assert.equal(product.attributes.stock.type, "integer");
  assert.equal(product.attributes.stock.min, 0);
  assert.equal(product.attributes.stock.default, 0);
  assert.deepEqual(product.attributes.currency.enum, ["RUB"]);
  assert.equal(product.attributes.slug.unique, true);
  assert.equal(product.attributes.slug.targetField, "displayName");
  assert.equal(product.attributes.slug.minLength, 1);
  assert.equal(product.attributes.active, undefined);
  assert.equal(product.attributes.sortOrder, undefined);
  assert.match(
    String(product.attributes.packageLabel.description),
    /Маленькая банка \(90 г\).*Пакетик \(50 г\)/,
  );
});

test("home page stores ordered curated nabor and tovar collections", async () => {
  const home = await schema(
    "src/api/home-page/content-types/home-page/schema.json",
  );

  for (const field of ["featuredNabory", "featuredTovary"]) {
    assert.equal(home.attributes[field]?.type, "relation");
    assert.equal(home.attributes[field]?.relation, "oneToMany");
    assert.equal(home.attributes[field]?.target, "api::product.product");
  }

  assert.equal(home.attributes.ritualsPreview, undefined);
  assert.equal(home.attributes.productsPreview, undefined);
  assert.equal(home.attributes.naboryPreview.component, "home.rituals-preview");
  assert.equal(home.attributes.tovaryPreview.component, "home.catalog-preview");
});

test("global settings expose reusable breadcrumb and storefront text components", async () => {
  const global = await schema(
    "src/api/global-setting/content-types/global-setting/schema.json",
  );
  const breadcrumb = await schema(
    "src/components/shared/section-breadcrumb.json",
  );
  const storefrontTexts = await schema(
    "src/components/shared/storefront-texts.json",
  );

  assert.equal(global.attributes.sectionBreadcrumbs.type, "component");
  assert.equal(global.attributes.sectionBreadcrumbs.repeatable, true);
  assert.equal(global.attributes.sectionBreadcrumbs.required, false);
  assert.equal(
    global.attributes.storefrontTexts.component,
    "shared.storefront-texts",
  );
  assert.equal(global.attributes.storefrontTexts.required, true);
  assert.deepEqual(breadcrumb.attributes.route.enum, ["tovary", "nabory"]);
  assert.equal(breadcrumb.attributes.label.required, true);
  assert.equal(storefrontTexts.attributes.imagePlaceholder.required, true);
  assert.equal(storefrontTexts.attributes.outOfStock.required, true);
});

test("home and catalog schemas expose every agreed editable text", async () => {
  const hero = await schema("src/components/home/hero.json");
  const about = await schema("src/components/home/editorial-section.json");
  const preview = await schema("src/components/home/catalog-preview.json");
  const ritualsPreview = await schema(
    "src/components/home/rituals-preview.json",
  );
  const page = await schema(
    "src/api/products-page/content-types/products-page/schema.json",
  );

  assert.equal(hero.attributes.eyebrow.required, true);
  assert.equal(about.attributes.eyebrow.required, true);
  assert.equal(about.attributes.title.required, true);
  assert.equal(about.attributes.text, undefined);
  assert.equal(about.attributes.textBlock1.required, false);
  assert.equal(about.attributes.textBlock2.required, false);
  assert.equal(about.attributes.image, undefined);
  assert.equal(preview.attributes.eyebrow.required, true);
  assert.equal(preview.attributes.linkLabel.required, false);
  assert.equal(ritualsPreview.attributes.eyebrow.required, true);
  assert.equal(ritualsPreview.attributes.linkLabel, undefined);
  assert.equal(page.attributes.eyebrow.required, true);
  assert.equal(page.attributes.emptyStateText.required, true);
  assert.equal(page.attributes.emptyStateLinkLabel.required, true);
  assert.equal(page.attributes.intro.type, "text");
  assert.equal(page.attributes.intro.required, true);
  assert.equal(page.attributes.image, undefined);
});

test("global checkout settings are bounded and the order email stays private", async () => {
  const global = await schema(
    "src/api/global-setting/content-types/global-setting/schema.json",
  );

  assert.equal(global.attributes.pickupAddress.required, true);
  assert.equal(global.attributes.pickupDiscountPercent.required, false);
  assert.equal(global.attributes.pickupDiscountPercent.default, undefined);
  assert.equal(global.attributes.pickupDiscountPercent.min, 0);
  assert.equal(global.attributes.pickupDiscountPercent.max, 100);
  assert.equal(global.attributes.courierDeliveryNote.required, true);
  assert.equal(global.attributes.orderNotificationEmail.required, true);
  assert.equal(global.attributes.orderNotificationEmail.private, true);
  assert.equal(global.attributes.logo.required, false);
});

test("main image is optional while an attached image requires alt text", async () => {
  const product = await schema(
    "src/api/product/content-types/product/schema.json",
  );
  const image = await schema("src/components/shared/image-with-alt.json");

  assert.equal(product.attributes.mainImage.required, false);
  assert.equal(image.attributes.image.required, true);
  assert.equal(image.attributes.alt.required, true);
});

test("product supports ordered repeatable rich-content articles", async () => {
  const product = await schema(
    "src/api/product/content-types/product/schema.json",
  );
  const article = await schema("src/components/product/article.json");

  assert.equal(product.attributes.articleContent, undefined);
  assert.equal(product.attributes.articles.type, "component");
  assert.equal(product.attributes.articles.component, "product.article");
  assert.equal(product.attributes.articles.repeatable, true);
  assert.equal(product.attributes.articles.required, false);
  assert.equal(article.attributes.content.type, "json");
  assert.equal(
    article.attributes.content.customField,
    "plugin::better-blocks.better-blocks",
  );
  assert.equal(article.attributes.content.required, true);
  assert.equal(article.attributes.betterContent, undefined);
});

test("public page entities use the optional shared SEO component", async () => {
  for (const path of [
    "src/api/home-page/content-types/home-page/schema.json",
    "src/api/products-page/content-types/products-page/schema.json",
    "src/api/product/content-types/product/schema.json",
  ]) {
    const contentType = await schema(path);
    assert.equal(contentType.attributes.seo.type, "component");
    assert.equal(contentType.attributes.seo.component, "shared.seo");
    assert.equal(contentType.attributes.seo.repeatable, false);
    assert.equal(contentType.attributes.seo.required, false);
    assert.equal(contentType.attributes.seoTitle, undefined);
    assert.equal(contentType.attributes.seoDescription, undefined);
    assert.equal(contentType.attributes.seoImage, undefined);
  }
});

test("original product title accepts Cyrillic text only", async () => {
  const product = await schema(
    "src/api/product/content-types/product/schema.json",
  );
  const expression = new RegExp(
    product.attributes.originalTitle.regex as string,
  );

  assert.equal(expression.test("Большой красный халат"), true);
  assert.equal(expression.test("大红袍"), false);
  assert.equal(expression.test("Da Hong Pao"), false);
});

test("custom colors use the official Strapi color picker", async () => {
  const hero = await schema("src/components/home/hero.json");
  const about = await schema("src/components/home/editorial-section.json");

  for (const component of [hero, about]) {
    assert.equal(
      component.attributes.backgroundColor.customField,
      "plugin::color-picker.color",
    );
    assert.equal(
      component.attributes.textColor.customField,
      "plugin::color-picker.color",
    );
  }
});

test("editorial length guidance does not create validation errors", async () => {
  const product = await schema(
    "src/api/product/content-types/product/schema.json",
  );
  const seo = await schema("src/components/shared/seo.json");
  const hero = await schema("src/components/home/hero.json");

  for (const attribute of [
    product.attributes.title,
    product.attributes.cardExcerpt,
    product.attributes.story,
    seo.attributes.title,
    seo.attributes.description,
    hero.attributes.title,
    hero.attributes.text,
  ]) {
    assert.equal(attribute.maxLength, undefined);
  }
});
