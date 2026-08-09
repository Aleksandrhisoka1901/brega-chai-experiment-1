import assert from "node:assert/strict";
import test from "node:test";

import { createFetchCheckoutClient, createIdempotencyKey } from "./client.ts";

test("creates a UUID when randomUUID is unavailable on an insecure origin", () => {
  const source = {
    getRandomValues(target: Uint8Array) {
      target.forEach((_, index) => {
        target[index] = index;
      });
      return target;
    },
  };

  assert.equal(
    createIdempotencyKey(source),
    "00010203-0405-4607-8809-0a0b0c0d0e0f",
  );
});

test("fetch client prepares signed token and reuses idempotency key on retry", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{
    formToken: string;
    order: Record<string, unknown>;
  }> = [];
  let postCount = 0;
  let tokenCount = 0;
  globalThis.fetch = async (_input, init) => {
    if (!init?.method) {
      tokenCount += 1;
      return Response.json({ formToken: `signed-token-${tokenCount}` });
    }
    const body = JSON.parse(String(init.body)) as {
      formToken: string;
      order: Record<string, unknown>;
    };
    requests.push(body);
    postCount += 1;
    return postCount === 1
      ? Response.json(
          { error: { message: "Попробуйте снова" } },
          { status: 503 },
        )
      : Response.json(
          { orderId: "order-1", orderNumber: "2607-0001" },
          { status: 201 },
        );
  };

  try {
    const client = createFetchCheckoutClient({ minimumFillMs: 0 });
    await client.prepare?.();
    const input = {
      customer: {
        deliveryMethod: "courier" as const,
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
          slug: "tea",
          type: "tovar" as const,
          title: "Tea",
          packageLabel: "50 г",
          unitPriceSnapshot: 1200,
          currency: "RUB" as const,
          image: { url: "/tea.png", alt: "Tea" },
          quantity: 1,
        },
      ],
      honeypot: false,
    };
    assert.equal((await client.submit(input)).ok, false);
    assert.deepEqual(await client.submit(input), {
      ok: true,
      orderNumber: "2607-0001",
      message:
        "Менеджер свяжется с вами, чтобы подтвердить наличие и согласовать оплату.",
    });
    assert.equal((await client.submit(input)).ok, true);
    assert.equal(
      requests[0]?.order.idempotencyKey,
      requests[1]?.order.idempotencyKey,
    );
    assert.notEqual(
      requests[1]?.order.idempotencyKey,
      requests[2]?.order.idempotencyKey,
    );
    assert.equal(requests[0]?.formToken, requests[1]?.formToken);
    assert.notEqual(requests[1]?.formToken, requests[2]?.formToken);
    assert.equal(tokenCount, 2);
    assert.equal(requests[0]?.order.deliveryMethod, "courier");
    assert.equal(requests[0]?.order.deliveryAddress, "Москва");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pickup submission never trusts or forwards a customer address", async () => {
  const originalFetch = globalThis.fetch;
  let order: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    if (!init?.method) return Response.json({ formToken: "signed-token" });
    order = (
      JSON.parse(String(init.body)) as { order: Record<string, unknown> }
    ).order;
    return Response.json(
      { orderId: "order-1", orderNumber: "2607-0001" },
      { status: 201 },
    );
  };

  try {
    const client = createFetchCheckoutClient({ minimumFillMs: 0 });
    await client.submit({
      customer: {
        deliveryMethod: "pickup",
        name: "Анна",
        phone: "+79991234567",
        email: undefined,
        deliveryAddress: "Клиентский адрес нельзя использовать",
        comment: undefined,
        privacyConsent: true,
        termsConsent: true,
      },
      items: [
        {
          productId: "product-1",
          slug: "tea-a1b2c3",
          type: "tovar",
          title: "Tea",
          packageLabel: "50 г",
          unitPriceSnapshot: 1200,
          currency: "RUB",
          image: { url: "/tea.png", alt: "Tea" },
          quantity: 1,
        },
      ],
      honeypot: false,
    });

    assert.equal(order?.deliveryMethod, "pickup");
    assert.equal("deliveryAddress" in (order ?? {}), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
