import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { describe, test } from "node:test";

const execFileAsync = promisify(execFile);
const enabled = process.env.ORDER_HTTP_TEST_ALLOW === "seeded-local-database";

type ProductRow = {
  document_id: string;
  stock: number;
};

type OrderRow = {
  document_id: string;
  idempotency_key: string;
  lines: Array<{ productId: string; quantity: number }>;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Set ${name} to run the order HTTP integration test`);
  return value;
}

async function postgresJson<T>(query: string): Promise<T> {
  const databaseUrl = process.env.ORDER_HTTP_TEST_DATABASE_URL;
  const args = databaseUrl
    ? [databaseUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", query]
    : [
        "-h",
        process.env.DATABASE_HOST ?? "127.0.0.1",
        "-p",
        process.env.DATABASE_PORT ?? "5432",
        "-U",
        requiredEnvironment("DATABASE_USERNAME"),
        "-d",
        requiredEnvironment("DATABASE_NAME"),
        "-X",
        "-A",
        "-t",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        query,
      ];
  const { stdout } = await execFileAsync(process.env.PSQL_BIN ?? "psql", args, {
    env: {
      ...process.env,
      PGPASSWORD:
        process.env.ORDER_HTTP_TEST_DATABASE_PASSWORD ??
        process.env.DATABASE_PASSWORD,
    },
  });
  return JSON.parse(stdout.trim()) as T;
}

async function productBySeedKey(seedKey: string): Promise<ProductRow> {
  assert.match(seedKey, /^[a-z0-9-]+$/);
  return postgresJson<ProductRow>(`
    SELECT json_build_object(
      'document_id', document_id,
      'stock', stock
    )
    FROM products
    WHERE seed_key = '${seedKey}'
      AND published_at IS NOT NULL
    ORDER BY published_at DESC
    LIMIT 1
  `);
}

async function orderByIdempotencyKey(
  idempotencyKey: string,
): Promise<OrderRow | null> {
  assert.match(idempotencyKey, /^[0-9a-f-]{36}$/);
  return postgresJson<OrderRow | null>(`
    SELECT COALESCE(
      (
        SELECT json_build_object(
          'document_id', document_id,
          'idempotency_key', idempotency_key,
          'lines', lines
        )
        FROM orders
        WHERE idempotency_key = '${idempotencyKey}'
      ),
      'null'::json
    )
  `);
}

async function freshFormToken(webUrl: string): Promise<string> {
  const response = await fetch(new URL("/api/checkout/orders", webUrl));
  assert.equal(response.status, 200, await response.clone().text());
  const body = (await response.json()) as { formToken?: unknown };
  const formToken = body.formToken;
  if (typeof formToken !== "string") {
    throw new Error("BFF form-token response did not contain a string token");
  }

  // The anti-bot token deliberately rejects submissions younger than 1.5s.
  await new Promise((resolve) => setTimeout(resolve, 1_600));
  return formToken;
}

function browserOrder(productId: string, idempotencyKey = randomUUID()) {
  return {
    formToken: "",
    honeypot: "",
    order: {
      idempotencyKey,
      customer: { name: "HTTP integration", phone: "+79991234567" },
      deliveryAddress: "Москва, интеграционный тест",
      comment: "Real Next BFF to Strapi to PostgreSQL",
      consents: {
        personalData: {
          accepted: true,
          documentVersion: "integration-test",
        },
        salesAndDelivery: {
          accepted: true,
          documentVersion: "integration-test",
        },
      },
      items: [{ productId, quantity: 1 }],
    },
  };
}

async function submit(webUrl: string, body: ReturnType<typeof browserOrder>) {
  body.formToken = await freshFormToken(webUrl);
  return fetch(new URL("/api/checkout/orders", webUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe(
  "real order HTTP flow",
  { skip: enabled ? false : "set ORDER_HTTP_TEST_ALLOW=seeded-local-database" },
  () => {
    test("persists one order and decrements stock once on a double submit", async () => {
      const webUrl = requiredEnvironment("ORDER_HTTP_TEST_WEB_URL");
      const productBefore = await productBySeedKey("product-da-hong-pao");
      assert.ok(productBefore.stock >= 1, "seeded product must have stock");

      const request = browserOrder(productBefore.document_id);
      const first = await submit(webUrl, request);
      assert.equal(first.status, 201, await first.clone().text());
      const firstResult = (await first.json()) as { orderId: string };

      const second = await submit(webUrl, request);
      assert.equal(second.status, 201, await second.clone().text());
      const secondResult = (await second.json()) as { orderId: string };
      assert.equal(secondResult.orderId, firstResult.orderId);

      const persisted = await orderByIdempotencyKey(
        request.order.idempotencyKey,
      );
      assert.ok(persisted, "order must be persisted in PostgreSQL");
      assert.equal(persisted.document_id, firstResult.orderId);
      assert.deepEqual(
        persisted.lines.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
        [{ productId: productBefore.document_id, quantity: 1 }],
      );

      const productAfter = await productBySeedKey("product-da-hong-pao");
      assert.equal(productAfter.stock, productBefore.stock - 1);
    });

    test("rejects insufficient stock without persisting an order", async () => {
      const webUrl = requiredEnvironment("ORDER_HTTP_TEST_WEB_URL");
      const soldOut = await productBySeedKey("product-sold-out");
      assert.equal(soldOut.stock, 0, "sold-out seed contract changed");

      const request = browserOrder(soldOut.document_id);
      const response = await submit(webUrl, request);
      assert.equal(response.status, 409, await response.text());
      assert.equal(
        await orderByIdempotencyKey(request.order.idempotencyKey),
        null,
      );

      const productAfter = await productBySeedKey("product-sold-out");
      assert.equal(productAfter.stock, 0);
    });
  },
);
