import assert from "node:assert/strict";
import test from "node:test";

import { createFetchCheckoutClient } from "./client.ts";

test("fetch client prepares signed token and reuses idempotency key on retry", async () => {
  const originalFetch = globalThis.fetch;
  const orders: Array<Record<string, unknown>> = [];
  let postCount = 0;
  globalThis.fetch = async (_input, init) => {
    if (!init?.method) return Response.json({ formToken: "signed-token" });
    const body = JSON.parse(String(init.body)) as {
      order: Record<string, unknown>;
    };
    orders.push(body.order);
    postCount += 1;
    return postCount === 1
      ? Response.json(
          { error: { message: "Попробуйте снова" } },
          { status: 503 },
        )
      : Response.json({ orderId: "order-1" }, { status: 201 });
  };

  try {
    const client = createFetchCheckoutClient({ minimumFillMs: 0 });
    await client.prepare?.();
    const input = {
      customer: {
        name: "Анна",
        phone: "+79991234567" as `+${string}`,
        email: undefined,
        deliveryAddress: "Москва",
        comment: undefined,
        privacyConsent: true,
        termsConsent: true,
      },
      items: [
        {
          productId: "product-1",
          slug: "tea-a1b2c3",
          type: "product" as const,
          title: "Tea",
          packageLabel: "50 г",
          unitPriceSnapshot: 1200,
          currency: "RUB" as const,
          image: { url: "/tea.png", alt: "Tea" },
          quantity: 1,
        },
      ],
      honeypot: "",
    };
    assert.equal((await client.submit(input)).ok, false);
    assert.equal((await client.submit(input)).ok, true);
    assert.equal(orders[0]?.idempotencyKey, orders[1]?.idempotencyKey);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
