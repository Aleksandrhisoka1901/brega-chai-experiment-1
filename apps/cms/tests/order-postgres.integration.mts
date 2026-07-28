import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import pg from "pg";

import {
  createOrder,
  OrderServiceError,
  transitionOrderStatus,
  type LockedProduct,
  type OrderDraft,
  type OrderPersistence,
  type OrderStatusHistoryEntry,
  type OrderStatusPersistence,
  type OrderStatusTransactionRepository,
  type StoredOrder,
  type TransactionRepository,
} from "../src/api/order/services/order-domain.ts";

if (process.env.ORDER_PG_TEST_ALLOW !== "isolated-schema") {
  throw new Error(
    "Set ORDER_PG_TEST_ALLOW=isolated-schema to confirm isolated test schema usage",
  );
}

const schema = `order_it_${process.pid}_${randomBytes(5).toString("hex")}`;
if (!/^order_it_[a-z0-9_]+$/.test(schema)) {
  throw new Error("Unsafe integration schema identifier");
}
const qualified = (table: "products" | "orders") => `"${schema}"."${table}"`;
const { Pool } = pg;
const pool = new Pool(
  process.env.ORDER_PG_TEST_URL
    ? { connectionString: process.env.ORDER_PG_TEST_URL, max: 8 }
    : {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? 5432),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        max: 8,
      },
);

const mapOrder = (row: Record<string, unknown>): StoredOrder => ({
  orderId: String(row.order_id),
  orderNumber: String(row.order_number),
  idempotencyKey: String(row.idempotency_key),
  requestFingerprint: String(row.request_fingerprint),
  status: row.status as StoredOrder["status"],
  customer: row.customer as StoredOrder["customer"],
  deliveryAddress: String(row.delivery_address),
  ...(row.comment ? { comment: String(row.comment) } : {}),
  consents: row.consents as StoredOrder["consents"],
  lines: row.lines as StoredOrder["lines"],
  currency: "RUB",
  totalRubles: Number(row.total_rubles),
  statusHistory: row.status_history as OrderStatusHistoryEntry[],
});

class PostgresOrderPersistence
  implements OrderPersistence, OrderStatusPersistence
{
  forceInsertFailure = false;

  async transaction<T>(
    lockKey: string,
    operation:
      | ((repository: TransactionRepository) => Promise<T>)
      | ((repository: OrderStatusTransactionRepository) => Promise<T>),
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        lockKey,
      ]);

      const repository = {
        findOrderByIdempotencyKey: async (key: string) => {
          const result = await client.query(
            `SELECT * FROM ${qualified("orders")} WHERE idempotency_key = $1`,
            [key],
          );
          return result.rows[0] ? mapOrder(result.rows[0]) : null;
        },
        lockProducts: async (productIds: string[]) => {
          const result = await client.query(
            `SELECT * FROM ${qualified("products")}
             WHERE product_id = ANY($1::text[]) AND published IS TRUE
             FOR UPDATE`,
            [productIds],
          );
          return result.rows.map(
            (row): LockedProduct => ({
              recordId: Number(row.record_id),
              productId: String(row.product_id),
              slug: String(row.slug),
              title: String(row.title),
              packageLabel: String(row.package_label),
              priceRubles: Number(row.price_rubles),
              currency: String(row.currency),
              stock: Number(row.stock),
              active: row.active === true,
              published: row.published === true,
            }),
          );
        },
        decrementStock: async (recordId: number, quantity: number) => {
          const result = await client.query(
            `UPDATE ${qualified("products")}
             SET stock = stock - $2
             WHERE record_id = $1 AND stock >= $2`,
            [recordId, quantity],
          );
          return result.rowCount === 1;
        },
        insertOrder: async (draft: OrderDraft) => {
          if (this.forceInsertFailure) {
            await client.query(
              `INSERT INTO ${qualified("orders")} (idempotency_key) VALUES ($1)`,
              [draft.idempotencyKey],
            );
          }

          const result = await client.query(
            `INSERT INTO ${qualified("orders")} (
               order_id, order_number, idempotency_key, request_fingerprint,
               status, customer, delivery_address, comment, consents, lines,
               currency, total_rubles, status_history
             ) VALUES (
               $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10::jsonb,
               $11, $12, $13::jsonb
             ) RETURNING *`,
            [
              randomUUID(),
              `BC-${randomBytes(5).toString("hex").toUpperCase()}`,
              draft.idempotencyKey,
              draft.requestFingerprint,
              draft.status,
              JSON.stringify(draft.customer),
              draft.deliveryAddress,
              draft.comment ?? null,
              JSON.stringify(draft.consents),
              JSON.stringify(draft.lines),
              draft.currency,
              draft.totalRubles,
              JSON.stringify(draft.statusHistory),
            ],
          );
          return mapOrder(result.rows[0]);
        },
        lockOrder: async (orderId: string) => {
          const result = await client.query(
            `SELECT * FROM ${qualified("orders")} WHERE order_id = $1 FOR UPDATE`,
            [orderId],
          );
          return result.rows[0] ? mapOrder(result.rows[0]) : null;
        },
        restoreStock: async (recordId: number, quantity: number) => {
          const result = await client.query(
            `UPDATE ${qualified("products")}
             SET stock = stock + $2
             WHERE record_id = $1`,
            [recordId, quantity],
          );
          return result.rowCount === 1;
        },
        updateStatus: async (
          orderId: string,
          status: StoredOrder["status"],
          statusHistory: OrderStatusHistoryEntry[],
        ) => {
          const result = await client.query(
            `UPDATE ${qualified("orders")}
             SET status = $2, status_history = $3::jsonb
             WHERE order_id = $1
             RETURNING *`,
            [orderId, status, JSON.stringify(statusHistory)],
          );
          return result.rows[0] ? mapOrder(result.rows[0]) : null;
        },
      };

      const result = await operation(repository);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

const persistence = new PostgresOrderPersistence();
const orderInput = (idempotencyKey = randomUUID()) => ({
  idempotencyKey,
  customer: { name: "Анна", phone: "+79991234567" },
  deliveryAddress: "Москва, ул. Чайная, д. 1",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
});

before(async () => {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  await pool.query(`
    CREATE TABLE ${qualified("products")} (
      record_id serial PRIMARY KEY,
      product_id text NOT NULL UNIQUE,
      slug text NOT NULL,
      title text NOT NULL,
      package_label text NOT NULL,
      price_rubles integer NOT NULL,
      currency text NOT NULL,
      stock integer NOT NULL CHECK (stock >= 0),
      active boolean NOT NULL,
      published boolean NOT NULL
    );
    CREATE TABLE ${qualified("orders")} (
      order_id text PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      idempotency_key text NOT NULL UNIQUE,
      request_fingerprint text NOT NULL,
      status text NOT NULL,
      customer jsonb NOT NULL,
      delivery_address text NOT NULL,
      comment text,
      consents jsonb NOT NULL,
      lines jsonb NOT NULL,
      currency text NOT NULL,
      total_rubles integer NOT NULL,
      status_history jsonb NOT NULL
    );
  `);
});

beforeEach(async () => {
  persistence.forceInsertFailure = false;
  await pool.query(
    `TRUNCATE ${qualified("orders")}, ${qualified("products")} RESTART IDENTITY`,
  );
  await pool.query(
    `INSERT INTO ${qualified("products")} (
       product_id, slug, title, package_label, price_rubles, currency,
       stock, active, published
     ) VALUES ('product-1', 'da-hun-pao-a1b2c3', 'Да Хун Пао', '50 г',
       1600, 'RUB', 5, true, true)`,
  );
});

after(async () => {
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await pool.end();
  }
});

test("concurrent same-key create persists and decrements exactly once", async () => {
  const input = orderInput();
  const [first, second] = await Promise.all([
    createOrder(input, persistence),
    createOrder(input, persistence),
  ]);

  assert.equal(first.orderId, second.orderId);
  const orders = await pool.query(
    `SELECT count(*)::int AS count FROM ${qualified("orders")}`,
  );
  const product = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(orders.rows[0].count, 1);
  assert.equal(product.rows[0].stock, 3);
});

test("same idempotency key with conflicting payload is rejected", async () => {
  const input = orderInput();
  await createOrder(input, persistence);

  await assert.rejects(
    createOrder(
      { ...input, deliveryAddress: "Казань, ул. Другая, д. 2" },
      persistence,
    ),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("database insert failure rolls back the stock decrement", async () => {
  persistence.forceInsertFailure = true;
  await assert.rejects(createOrder(orderInput(), persistence));

  const product = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  const orders = await pool.query(
    `SELECT count(*)::int AS count FROM ${qualified("orders")}`,
  );
  assert.equal(product.rows[0].stock, 5);
  assert.equal(orders.rows[0].count, 0);
});

test("cancellation restores stock once", async () => {
  const created = await createOrder(orderInput(), persistence);
  await transitionOrderStatus(created.orderId, "cancelled", persistence);

  const restored = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(restored.rows[0].stock, 5);

  await assert.rejects(
    transitionOrderStatus(created.orderId, "cancelled", persistence),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "INVALID_STATUS_TRANSITION",
  );
  const unchanged = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(unchanged.rows[0].stock, 5);
});
