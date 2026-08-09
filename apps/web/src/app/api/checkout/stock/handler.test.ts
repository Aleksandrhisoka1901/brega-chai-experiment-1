import assert from "node:assert/strict";
import test from "node:test";

import { handleStockRequest } from "./handler.ts";

test("fetches current published stock without cache and marks missing products unavailable", async () => {
  let forwarded: Request | undefined;
  const response = await handleStockRequest(
    new Request("http://local/api/checkout/stock", {
      method: "POST",
      body: JSON.stringify({ productIds: ["product-1", "product-2"] }),
    }),
    {
      cmsUrl: "http://cms:1337",
      fetch: async (request) => {
        forwarded = request;
        return Response.json({
          data: [{ documentId: "product-1", stock: 3 }],
        });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(forwarded?.cache, "no-store");
  assert.equal(
    new URL(forwarded!.url).searchParams.get("filters[documentId][$in][0]"),
    "product-1",
  );
  assert.deepEqual(await response.json(), {
    stocks: [
      { productId: "product-1", stock: 3 },
      { productId: "product-2", stock: 0 },
    ],
  });
});

test("rejects duplicate IDs and hides CMS failures", async () => {
  let calls = 0;
  const invalid = await handleStockRequest(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ productIds: ["product-1", "product-1"] }),
    }),
    {
      cmsUrl: "http://cms",
      fetch: async () => {
        calls += 1;
        return new Response();
      },
    },
  );
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);

  const unavailable = await handleStockRequest(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ productIds: ["product-1"] }),
    }),
    {
      cmsUrl: "http://cms",
      fetch: async () =>
        Response.json(
          { error: "private CMS error", phone: "+79991234567" },
          { status: 500 },
        ),
    },
  );
  const body = JSON.stringify(await unavailable.json());
  assert.equal(unavailable.status, 503);
  assert.equal(body.includes("private CMS error"), false);
  assert.equal(body.includes("+79991234567"), false);
});
