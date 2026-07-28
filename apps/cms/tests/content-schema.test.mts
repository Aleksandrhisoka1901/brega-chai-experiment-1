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
  assert.deepEqual(product.attributes.type.enum, ["ritual", "product"]);
  assert.equal(product.attributes.price.type, "integer");
  assert.equal(product.attributes.price.required, true);
  assert.equal(product.attributes.price.min, 1);
  assert.equal(product.attributes.stock.type, "integer");
  assert.equal(product.attributes.stock.min, 0);
  assert.equal(product.attributes.stock.default, 0);
  assert.deepEqual(product.attributes.currency.enum, ["RUB"]);
  assert.equal(product.attributes.slug.unique, true);
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
