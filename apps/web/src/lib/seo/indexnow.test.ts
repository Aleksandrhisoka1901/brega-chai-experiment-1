import assert from "node:assert/strict";
import test from "node:test";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  indexNowKeyLocation,
  submitIndexNow,
  urlsForIndexNowEvent,
} from "./indexnow.ts";

test("notifies Yandex IndexNow about storefront URLs including wholesale", () => {
  assert.deepEqual(urlsForIndexNowEvent({ event: "home" }, "https://lon-energy.ru"), [
    "https://lon-energy.ru/",
  ]);
  assert.deepEqual(
    urlsForIndexNowEvent(
      { event: "product", product: { type: "tovar", slug: "gt200" } },
      "https://lon-energy.ru",
    ),
    [
      "https://lon-energy.ru/stantsii/gt200",
      "https://lon-energy.ru/stantsii",
      "https://lon-energy.ru/",
    ],
  );
  assert.deepEqual(urlsForIndexNowEvent({ event: "wholesale" }, "https://lon-energy.ru"), [
    "https://lon-energy.ru/dlya-optovikov",
  ]);
  assert.equal(
    indexNowKeyLocation("https://lon-energy.ru"),
    `https://lon-energy.ru/${INDEXNOW_KEY}.txt`,
  );
});

test("posts a signed IndexNow payload to Yandex", async () => {
  const sent: Array<{ url: string; body: unknown }> = [];
  await submitIndexNow(["https://lon-energy.ru/", "https://lon-energy.ru/"], {
    origin: "https://lon-energy.ru",
    fetchImpl: async (input, init) => {
      sent.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
      });
      return new Response(null, { status: 200 });
    },
  });

  assert.deepEqual(sent, [
    {
      url: INDEXNOW_ENDPOINT,
      body: {
        host: "lon-energy.ru",
        key: INDEXNOW_KEY,
        keyLocation: `https://lon-energy.ru/${INDEXNOW_KEY}.txt`,
        urlList: ["https://lon-energy.ru/"],
      },
    },
  ]);
});
