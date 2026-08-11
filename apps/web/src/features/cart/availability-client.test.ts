import assert from "node:assert/strict";
import test from "node:test";

import { fetchCartStock } from "./availability-client.ts";

test("deduplicates cart IDs and returns current stock without cache", async () => {
  let request: Request | undefined;
  const stock = await fetchCartStock(
    [
      { productId: "product-1" },
      { productId: "product-1" },
      { productId: "product-2" },
    ],
    async (input, init) => {
      request = new Request(new URL(String(input), "http://localhost"), init);
      return Response.json({
        stocks: [
          { productId: "product-1", stock: 2 },
          { productId: "product-2", stock: 0 },
        ],
      });
    },
  );

  assert.equal(request?.url, "http://localhost/api/checkout/stock");
  assert.equal(request?.cache, "no-store");
  assert.deepEqual(await request?.json(), {
    productIds: ["product-1", "product-2"],
  });
  assert.deepEqual(stock, { "product-1": 2, "product-2": 0 });
});

test("rejects an unavailable or malformed stock response", async () => {
  await assert.rejects(
    fetchCartStock([{ productId: "product-1" }], async () =>
      Response.json({}, { status: 503 }),
    ),
  );
  await assert.rejects(
    fetchCartStock([{ productId: "product-1" }], async () =>
      Response.json({ stocks: [{ productId: "product-1", stock: -1 }] }),
    ),
  );
});
