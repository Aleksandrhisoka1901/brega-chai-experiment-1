import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  createMemoryDeliveryStore,
  handleRevalidation,
  type RevalidationDependencies,
} from "./handler.ts";

const secret = "revalidation-test-secret";

function signedRequest(body: unknown, signatureSecret = secret) {
  const raw = JSON.stringify({
    action: "update",
    occurredAt: "2026-07-29T00:00:00.000Z",
    ...(body as Record<string, unknown>),
  });
  const signature = createHmac("sha256", signatureSecret)
    .update(raw)
    .digest("hex");
  return new Request("http://local/api/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidation-signature": `sha256=${signature}`,
    },
    body: raw,
  });
}

function harness() {
  const tags: string[] = [];
  const paths: Array<[string, "page" | "layout" | undefined]> = [];
  const dependencies: RevalidationDependencies = {
    secret,
    deliveries: createMemoryDeliveryStore(),
    revalidateTag: (tag) => tags.push(tag),
    revalidatePath: (path, type) => paths.push([path, type]),
  };
  return { dependencies, tags, paths };
}

test("rejects an invalid signature without parsing or purging", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({ id: "evt-1", event: "home" }, "wrong-secret"),
    dependencies,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: { code: "INVALID_SIGNATURE", message: "Unauthorized webhook." },
  });
  assert.deepEqual(tags, []);
  assert.deepEqual(paths, []);
});

test("rejects unknown events without exposing a cache purge", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({ id: "evt-2", event: "everything" }),
    dependencies,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { code: "INVALID_EVENT", message: "Unsupported webhook event." },
  });
  assert.deepEqual(tags, []);
  assert.deepEqual(paths, []);
});

test("maps home, global and products to their exact cache boundaries", async () => {
  const expected = [
    {
      payload: { id: "evt-home", event: "home" },
      tags: ["home"],
      paths: [["/", "page"]],
    },
    {
      payload: { id: "evt-global", event: "global" },
      tags: ["global"],
      paths: [["/", "layout"]],
    },
    {
      payload: { id: "evt-products", event: "products" },
      tags: ["products"],
      paths: [
        ["/tovary", "page"],
        ["/nabory", "page"],
      ],
    },
  ] as const;

  for (const item of expected) {
    const { dependencies, tags, paths } = harness();
    const response = await handleRevalidation(
      signedRequest(item.payload),
      dependencies,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(tags, item.tags);
    assert.deepEqual(paths, item.paths);
  }
});

test("maps one product to listing, detail and home", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({
      id: "evt-product",
      event: "product",
      product: {
        documentId: "doc-42",
        type: "tovar",
        slug: "sencha-42",
      },
    }),
    dependencies,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(tags, ["products", "product-slug:tovar:sencha-42"]);
  assert.deepEqual(paths, [
    ["/tovary", "page"],
    ["/nabory", "page"],
    ["/tovary/sencha-42", "page"],
    ["/", "page"],
  ]);
});

test("maps one article to listing and detail", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({
      id: "evt-article",
      event: "article",
      article: {
        documentId: "article-7",
        slug: "tihij-stol",
      },
    }),
    dependencies,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(tags, ["articles", "article-slug:tihij-stol"]);
  assert.deepEqual(paths, [
    ["/stati", "page"],
    ["/stati/tihij-stol", "page"],
  ]);
});

test("maps articles-page to the articles catalog", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({ id: "evt-articles", event: "articles" }),
    dependencies,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(tags, ["articles-page", "articles"]);
  assert.deepEqual(paths, [["/stati", "page"]]);
});

test("media updates invalidate every CMS image consumer", async () => {
  const { dependencies, tags, paths } = harness();
  const response = await handleRevalidation(
    signedRequest({ id: "evt-media", event: "media" }),
    dependencies,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(tags, ["home", "global", "products", "articles", "articles-page"]);
  assert.deepEqual(paths, [
    ["/", "layout"],
    ["/", "page"],
    ["/tovary", "page"],
    ["/nabory", "page"],
    ["/tovary/[slug]", "page"],
    ["/nabory/[slug]", "page"],
    ["/stati", "page"],
    ["/stati/[slug]", "page"],
  ]);
});

test("acknowledges a repeated delivery without purging twice", async () => {
  const { dependencies, tags, paths } = harness();
  const payload = { id: "evt-repeat", event: "home" };

  const first = await handleRevalidation(signedRequest(payload), dependencies);
  const repeated = await handleRevalidation(
    signedRequest(payload),
    dependencies,
  );

  assert.equal(first.status, 200);
  assert.deepEqual(await repeated.json(), {
    ok: true,
    eventId: "evt-repeat",
    duplicate: true,
  });
  assert.deepEqual(tags, ["home"]);
  assert.deepEqual(paths, [["/", "page"]]);
});

test("rejects an event ID reused for a different signed payload", async () => {
  const { dependencies, tags } = harness();

  const first = await handleRevalidation(
    signedRequest({ id: "evt-conflict", event: "home" }),
    dependencies,
  );
  const conflict = await handleRevalidation(
    signedRequest({ id: "evt-conflict", event: "products" }),
    dependencies,
  );

  assert.equal(first.status, 200);
  assert.equal(conflict.status, 409);
  assert.deepEqual(tags, ["home"]);
});

test("rejects an oversized signed payload before invalidation", async () => {
  const { dependencies, tags } = harness();
  const response = await handleRevalidation(
    signedRequest({
      id: "evt-large",
      event: "home",
      padding: "x".repeat(17_000),
    }),
    dependencies,
  );

  assert.equal(response.status, 413);
  assert.deepEqual(tags, []);
});
