import assert from "node:assert/strict";
import test from "node:test";

import { capabilityPageRequest, mapCapabilityPagePayload } from "./capability-page-mapper.ts";

test("requests published capability page with models and spec rows", () => {
  const { path, tags } = capabilityPageRequest();
  const url = new URL(path, "https://cms.example");
  assert.equal(url.pathname, "/api/capability-page");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("populate[models][fields][0]"), "slug");
  assert.deepEqual(tags, ["capability-page"]);
});

test("maps models, fallback images and padded table cells", () => {
  const page = mapCapabilityPagePayload(
    {
      data: {
        title: "Системы хранения",
        lead: "Ориентиры по характеристикам.",
        tableTitle: "Таблица",
        models: [
          { slug: "fp115", name: "FP115KWH", description: "115 кВт·ч" },
          { slug: "fp215", name: "FP215KWH", description: "215 кВт·ч" },
        ],
        specRows: [
          { label: "Ёмкость", cells: [{ value: "115,2 кВт·ч" }] },
        ],
      },
    },
    "https://media.example",
  );

  assert.equal(page?.title, "Системы хранения");
  assert.equal(page?.models[0]?.image, "/capability/fp115.png");
  assert.deepEqual(page?.rows[0]?.values, ["115,2 кВт·ч", "—"]);
});
