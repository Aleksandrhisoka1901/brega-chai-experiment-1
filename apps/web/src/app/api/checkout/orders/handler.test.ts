import assert from "node:assert/strict";
import test from "node:test";

import { createFormToken } from "./domain.ts";
import { handleCreateOrder } from "./handler.ts";

const secret = "test-secret-with-enough-entropy";
const order = {
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  customer: { name: "Анна", phone: "+79991234567" },
  deliveryAddress: "Москва, ул. Чайная, д. 1",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
};

test("forwards strict order with scoped token and idempotency header", async () => {
  let forwarded: Request | undefined;
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const response = await handleCreateOrder(
    new Request("http://local/api/checkout/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formToken: token, honeypot: "", order }),
    }),
    {
      now: () => 12_000,
      secret,
      strapiUrl: "http://cms:1337",
      strapiToken: "scoped-order-token",
      fetch: async (request) => {
        forwarded = request;
        return Response.json(
          {
            orderId: "order-1",
            status: "new",
            currency: "RUB",
            lines: [
              {
                productId: "product-1",
                slug: "tea-a1b2c3",
                title: "Tea",
                packageLabel: "50 г",
                unitPriceRubles: 1200,
                quantity: 2,
                lineTotalRubles: 2400,
                currency: "RUB",
              },
            ],
            totalRubles: 2400,
          },
          { status: 201 },
        );
      },
    },
  );

  assert.equal(response.status, 201);
  assert.equal(forwarded?.url, "http://cms:1337/api/orders");
  assert.equal(
    forwarded?.headers.get("authorization"),
    "Bearer scoped-order-token",
  );
  assert.equal(forwarded?.headers.get("idempotency-key"), order.idempotencyKey);
  assert.deepEqual(await forwarded?.json(), order);
});

test("honeypot and too-fast submissions never reach Strapi", async () => {
  let calls = 0;
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const fetch = async () => {
    calls += 1;
    return new Response();
  };

  const honeypot = await handleCreateOrder(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ formToken: token, honeypot: "spam", order }),
    }),
    {
      now: () => 12_000,
      secret,
      strapiUrl: "http://cms",
      strapiToken: "x",
      fetch,
    },
  );
  const fast = await handleCreateOrder(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ formToken: token, honeypot: "", order }),
    }),
    {
      now: () => 10_500,
      secret,
      strapiUrl: "http://cms",
      strapiToken: "x",
      fetch,
    },
  );

  assert.equal(honeypot.status, 400);
  assert.equal(fast.status, 429);
  assert.equal(calls, 0);
});

test("maps private upstream errors to safe public responses", async () => {
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const response = await handleCreateOrder(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ formToken: token, honeypot: "", order }),
    }),
    {
      now: () => 12_000,
      secret,
      strapiUrl: "http://cms",
      strapiToken: "x",
      fetch: async () =>
        Response.json(
          { error: "Database failed", customerPhone: "+79991234567" },
          { status: 500 },
        ),
    },
  );

  assert.equal(response.status, 503);
  const body = JSON.stringify(await response.json());
  assert.equal(body.includes("Database failed"), false);
  assert.equal(body.includes("+79991234567"), false);
});

test("aborts a slow Strapi request and returns a safe timeout", async () => {
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const response = await handleCreateOrder(
    new Request("http://local", {
      method: "POST",
      body: JSON.stringify({ formToken: token, honeypot: "", order }),
    }),
    {
      now: () => 12_000,
      secret,
      strapiUrl: "http://cms",
      strapiToken: "x",
      timeoutMs: 5,
      fetch: (request) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    },
  );

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: {
      code: "ORDER_SERVICE_TIMEOUT",
      message: "Сервис не ответил вовремя. Повторите попытку.",
    },
  });
});
