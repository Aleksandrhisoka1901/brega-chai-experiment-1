import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaPaths = [
  "src/api/product/content-types/product/schema.json",
  "src/api/products-page/content-types/products-page/schema.json",
  "src/api/global-setting/content-types/global-setting/schema.json",
  "src/components/home/editorial-section.json",
];

type Attribute = {
  description?: unknown;
  type?: unknown;
};

async function attributes(path: string) {
  const contents = await readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  );
  return (JSON.parse(contents) as { attributes: Record<string, Attribute> })
    .attributes;
}

test("every Blocks field gives editors rendering guidance", async () => {
  const blocksFields = (
    await Promise.all(
      schemaPaths.map(async (path) =>
        Object.entries(await attributes(path))
          .filter(([, attribute]) => attribute.type === "blocks")
          .map(([name, attribute]) => ({
            attribute,
            field: `${path}#${name}`,
          })),
      ),
    )
  ).flat();

  assert.ok(blocksFields.length > 0);

  for (const { attribute, field } of blocksFields) {
    assert.equal(
      typeof attribute.description,
      "string",
      `${field} must have a description`,
    );

    const description = attribute.description as string;
    assert.ok(description.trim(), `${field} must have a non-empty description`);
    assert.match(
      description,
      /H1.+H2/i,
      `${field} must explain how storefront heading levels are rendered`,
    );
    assert.match(
      description,
      /unsupported.+(?:executable|script).+not rendered/i,
      `${field} must explain that unsafe or unsupported content is omitted`,
    );
  }
});
