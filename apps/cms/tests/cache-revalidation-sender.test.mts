import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createCacheRevalidationSender } from "../src/cache-revalidation/sender.ts";
import { registerCacheRevalidationSubscriber } from "../src/cache-revalidation/subscriber.ts";

test("signs and sends a product publication event", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const sender = createCacheRevalidationSender({
    url: "https://store.example.test/api/revalidate",
    secret: "test-secret",
    now: () => new Date("2026-07-29T00:00:00.000Z"),
    randomUUID: () => "event-123",
    fetch: async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(null, { status: 204 });
    },
  });

  const result = await sender.send({
    event: "product",
    action: "publish",
    product: {
      documentId: "product-document-id",
      type: "tovar",
      slug: "assam",
    },
  });

  assert.deepEqual(result, { ok: true, eventId: "event-123" });
  assert.equal(requests.length, 1);
  const { url, init } = requests[0]!;
  const body = String(init.body);
  assert.equal(url, "https://store.example.test/api/revalidate");
  assert.deepEqual(JSON.parse(body), {
    id: "event-123",
    event: "product",
    action: "publish",
    product: {
      documentId: "product-document-id",
      type: "tovar",
      slug: "assam",
    },
    occurredAt: "2026-07-29T00:00:00.000Z",
  });
  assert.equal(
    new Headers(init.headers).get("x-revalidation-signature"),
    `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`,
  );
  assert.equal(
    new Headers(init.headers).get("content-type"),
    "application/json",
  );
});

test("times out without throwing when Next.js is unavailable", async () => {
  const warnings: unknown[][] = [];
  const sender = createCacheRevalidationSender({
    url: "https://store.example.test/api/revalidate",
    secret: "test-secret",
    timeoutMs: 5,
    logger: { warn: (...args) => warnings.push(args) },
    fetch: async (_url, init) =>
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      }),
  });

  const result = await sender.send({
    event: "home",
    action: "update",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "request-failed");
  assert.equal(warnings.length, 1);
});

test("treats a non-success response as a safe delivery failure", async () => {
  const sender = createCacheRevalidationSender({
    url: "https://store.example.test/api/revalidate",
    secret: "test-secret",
    fetch: async () => new Response(null, { status: 503 }),
  });

  const result = await sender.send({
    event: "global",
    action: "unpublish",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "http-error");
  assert.equal(result.status, 503);
});

test("is disabled safely when endpoint configuration is incomplete", async () => {
  let called = false;
  const sender = createCacheRevalidationSender({
    url: "",
    secret: "",
    fetch: async () => {
      called = true;
      return new Response();
    },
  });

  const result = await sender.send({
    event: "products",
    action: "publish",
  });

  assert.deepEqual(result, { ok: false, reason: "disabled" });
  assert.equal(called, false);
});

test("subscriber invalidates a physically deleted product as unpublished", async () => {
  let subscriber:
    | ((eventName: string, event: unknown) => Promise<void>)
    | undefined;
  const sent: unknown[] = [];
  const strapi = {
    eventHub: {
      subscribe(value: typeof subscriber) {
        subscriber = value;
        return () => {};
      },
    },
  };

  registerCacheRevalidationSubscriber(strapi, {
    send: async (event) => {
      sent.push(event);
      return { ok: true as const, eventId: "id" };
    },
  });

  await subscriber?.("entry.delete", {
    uid: "api::product.product",
    entry: {
      documentId: "deleted-document",
      slug: "sort-1234",
      type: "tovar",
    },
  });

  assert.deepEqual(sent, [
    {
      event: "product",
      action: "unpublish",
      product: {
        documentId: "deleted-document",
        slug: "sort-1234",
        type: "tovar",
      },
    },
  ]);
});

test("subscriber routes allowlisted publication events and ignores others", async () => {
  let subscriber:
    | ((eventName: string, event: unknown) => Promise<void>)
    | undefined;
  const sent: unknown[] = [];
  const strapi = {
    eventHub: {
      subscribe(value: typeof subscriber) {
        subscriber = value;
        return () => {};
      },
    },
  };

  registerCacheRevalidationSubscriber(strapi, {
    send: async (event) => {
      sent.push(event);
      return { ok: true as const, eventId: "id" };
    },
  });

  await subscriber?.("entry.publish", {
    uid: "api::product.product",
    entry: { documentId: "doc-1", slug: "darjeeling", type: "tovar" },
  });
  await subscriber?.("entry.update", {
    uid: "api::home-page.home-page",
    entry: { publishedAt: "2026-07-29T00:00:00.000Z" },
  });
  await subscriber?.("entry.publish", {
    uid: "api::rituals-page.rituals-page",
    entry: {},
  });
  await subscriber?.("entry.update", {
    uid: "api::product.product",
    entry: {
      documentId: "draft-doc",
      slug: "draft",
      type: "tovar",
      publishedAt: null,
    },
  });
  await subscriber?.("entry.unpublish", {
    uid: "api::global-setting.global-setting",
    entry: {},
  });
  await subscriber?.("entry.publish", {
    uid: "api::order.order",
    entry: {},
  });
  await subscriber?.("user.update", {});

  await subscriber?.("media.update", {
    media: { id: 42, updatedAt: "2026-08-16T12:34:56.000Z" },
  });

  assert.deepEqual(sent, [
    {
      event: "product",
      action: "publish",
      product: {
        documentId: "doc-1",
        slug: "darjeeling",
        type: "tovar",
      },
    },
    { event: "home", action: "update" },
    { event: "products", action: "publish" },
    { event: "global", action: "unpublish" },
    { event: "media", action: "update" },
  ]);
});
