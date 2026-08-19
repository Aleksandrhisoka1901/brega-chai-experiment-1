import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import pg from "pg";

import {
  createOrder,
  deleteOrder,
  editOrder,
  OrderServiceError,
  transitionOrderStatus,
  type LockedProduct,
  type OrderDraft,
  type OrderEditPatch,
  type OrderEditPersistence,
  type OrderEditTransactionRepository,
  type OrderDeletionPersistence,
  type OrderDeletionTransactionRepository,
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
  deliveryMethod: row.delivery_method as StoredOrder["deliveryMethod"],
  deliveryAddress: String(row.delivery_address),
  pickupDiscountPercent: Number(row.pickup_discount_percent),
  ...(row.comment ? { comment: String(row.comment) } : {}),
  managerComment: row.manager_comment ? String(row.manager_comment) : null,
  consents: row.consents as StoredOrder["consents"],
  lines: row.lines as StoredOrder["lines"],
  currency: "RUB",
  totalRubles: Number(row.total_rubles),
  discountedTotalRubles: Number(row.discounted_total_rubles),
  statusHistory: row.status_history as OrderStatusHistoryEntry[],
  updatedAt:
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(String(row.updated_at)).toISOString(),
});

class PostgresOrderPersistence
  implements
    OrderPersistence,
    OrderStatusPersistence,
    OrderEditPersistence,
    OrderDeletionPersistence
{
  forceInsertFailure = false;

  async transaction<T>(
    lockKey: string,
    operation:
      | ((repository: TransactionRepository) => Promise<T>)
      | ((repository: OrderStatusTransactionRepository) => Promise<T>)
      | ((repository: OrderEditTransactionRepository) => Promise<T>)
      | ((repository: OrderDeletionTransactionRepository) => Promise<T>),
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
              published: row.published === true,
            }),
          );
        },
        decrementStock: async (productId: string, quantity: number) => {
          const result = await client.query(
            `UPDATE ${qualified("products")}
             SET stock = stock - $2
             WHERE product_id = $1 AND stock >= $2`,
            [productId, quantity],
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
               status, customer, delivery_method, delivery_address,
               pickup_discount_percent, comment, consents, lines, currency,
               total_rubles, discounted_total_rubles, status_history
             ) VALUES (
               $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11::jsonb,
               $12::jsonb, $13, $14, $15, $16::jsonb
             ) RETURNING *`,
            [
              randomUUID(),
              `BC-${randomBytes(5).toString("hex").toUpperCase()}`,
              draft.idempotencyKey,
              draft.requestFingerprint,
              draft.status,
              JSON.stringify(draft.customer),
              draft.deliveryMethod,
              draft.deliveryAddress,
              draft.pickupDiscountPercent,
              draft.comment ?? null,
              JSON.stringify(draft.consents),
              JSON.stringify(draft.lines),
              draft.currency,
              draft.totalRubles,
              draft.discountedTotalRubles,
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
        lockExistingProductIds: async (productIds: string[]) => {
          const result = await client.query(
            `SELECT product_id FROM ${qualified("products")}
             WHERE product_id = ANY($1::text[])
             ORDER BY product_id
             FOR UPDATE`,
            [productIds],
          );
          return result.rows.map((row) => String(row.product_id));
        },
        restoreStock: async (productId: string, quantity: number) => {
          const result = await client.query(
            `UPDATE ${qualified("products")}
             SET stock = stock + $2
             WHERE product_id = $1`,
            [productId, quantity],
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
        updateOrder: async (orderId: string, patch: OrderEditPatch) => {
          const result = await client.query(
            `UPDATE ${qualified("orders")}
             SET delivery_address = $2, manager_comment = $3,
                 lines = $4::jsonb, total_rubles = $5,
                 discounted_total_rubles = $6, updated_at = now()
             WHERE order_id = $1
             RETURNING *`,
            [
              orderId,
              patch.deliveryAddress,
              patch.managerComment,
              JSON.stringify(patch.lines),
              patch.totalRubles,
              patch.discountedTotalRubles,
            ],
          );
          return result.rows[0] ? mapOrder(result.rows[0]) : null;
        },
        deleteOrder: async (orderId: string) => {
          const result = await client.query(
            `DELETE FROM ${qualified("orders")} WHERE order_id = $1`,
            [orderId],
          );
          return result.rowCount === 1;
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
  deliveryMethod: "courier",
  deliveryAddress: "Москва, ул. Чайная, д. 1",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
});

const checkoutSettings = {
  pickupAddress: "Москва, ул. Чайная, д. 1",
  pickupDiscountPercent: 10,
};

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
      published boolean NOT NULL
    );
    CREATE TABLE ${qualified("orders")} (
      order_id text PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      idempotency_key text NOT NULL UNIQUE,
      request_fingerprint text NOT NULL,
      status text NOT NULL,
      customer jsonb NOT NULL,
      delivery_method text NOT NULL,
      delivery_address text NOT NULL,
      pickup_discount_percent integer NOT NULL,
      comment text,
      manager_comment text,
      consents jsonb NOT NULL,
      lines jsonb NOT NULL,
      currency text NOT NULL,
      total_rubles integer NOT NULL,
      discounted_total_rubles integer NOT NULL,
      status_history jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
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
       stock, published
     ) VALUES ('product-1', 'da-hun-pao-a1b2c3', 'Да Хун Пао', '50 г',
       1600, 'RUB', 5, true)`,
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
    createOrder(input, persistence, checkoutSettings),
    createOrder(input, persistence, checkoutSettings),
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
  await createOrder(input, persistence, checkoutSettings);

  await assert.rejects(
    createOrder(
      { ...input, deliveryAddress: "Казань, ул. Другая, д. 2" },
      persistence,
      checkoutSettings,
    ),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("database insert failure rolls back the stock decrement", async () => {
  persistence.forceInsertFailure = true;
  await assert.rejects(
    createOrder(orderInput(), persistence, checkoutSettings),
  );

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
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
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

test("deleting an active order restores stock in the same transaction", async () => {
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );

  await deleteOrder(created.orderId, persistence);

  const product = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  const order = await pool.query(
    `SELECT count(*)::int AS count FROM ${qualified("orders")} WHERE order_id = $1`,
    [created.orderId],
  );
  assert.equal(product.rows[0].stock, 5);
  assert.equal(order.rows[0].count, 0);
});

test("deleting a cancelled order does not restore stock twice", async () => {
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  await transitionOrderStatus(created.orderId, "cancelled", persistence);

  await deleteOrder(created.orderId, persistence);

  const product = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(product.rows[0].stock, 5);
});

test("cancellation survives a changed physical product record id", async () => {
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  await pool.query(
    `UPDATE ${qualified("products")} SET record_id = 99
     WHERE product_id = 'product-1'`,
  );

  await transitionOrderStatus(created.orderId, "cancelled", persistence);

  const result = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(result.rows[0].stock, 5);
});

test("cancellation completes when a product was fully deleted", async () => {
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  await pool.query(
    `DELETE FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );

  await transitionOrderStatus(created.orderId, "cancelled", persistence);

  const order = await pool.query(
    `SELECT status FROM ${qualified("orders")} WHERE order_id = $1`,
    [created.orderId],
  );
  assert.equal(order.rows[0].status, "cancelled");
});

test("confirmation rejects a fully deleted product", async () => {
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  await pool.query(
    `DELETE FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );

  await assert.rejects(
    transitionOrderStatus(created.orderId, "confirmed", persistence),
    (error) =>
      error instanceof OrderServiceError && error.code === "PRODUCT_NOT_FOUND",
  );
  const order = await pool.query(
    `SELECT status FROM ${qualified("orders")} WHERE order_id = $1`,
    [created.orderId],
  );
  assert.equal(order.rows[0].status, "new");
});

test("admin edit atomically replaces lines and recalculates stock", async () => {
  await pool.query(
    `INSERT INTO ${qualified("products")} (
       product_id, slug, title, package_label, price_rubles, currency,
       stock, published
     ) VALUES ('product-2', 'te-guan-in-b2c3d4', 'Те Гуань Инь', '50 г',
       900, 'RUB', 4, true)`,
  );
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  const current = await pool.query(
    `SELECT updated_at FROM ${qualified("orders")} WHERE order_id = $1`,
    [created.orderId],
  );

  const updated = await editOrder(
    created.orderId,
    {
      expectedUpdatedAt: new Date(current.rows[0].updated_at).toISOString(),
      deliveryAddress: "Москва, новый адрес",
      managerComment: "Позвонить вечером",
      items: [{ productId: "product-2", quantity: 2 }],
    },
    persistence,
  );

  assert.equal(updated.totalRubles, 1800);
  assert.equal(updated.managerComment, "Позвонить вечером");
  const stocks = await pool.query(
    `SELECT product_id, stock FROM ${qualified("products")} ORDER BY product_id`,
  );
  assert.deepEqual(stocks.rows, [
    { product_id: "product-1", stock: 5 },
    { product_id: "product-2", stock: 2 },
  ]);
});

test("admin edit may reserve all stock above the public cart limit", async () => {
  await pool.query(
    `UPDATE ${qualified("products")} SET stock = 250 WHERE product_id = 'product-1'`,
  );
  const created = await createOrder(
    orderInput(),
    persistence,
    checkoutSettings,
  );
  const current = await pool.query(
    `SELECT updated_at FROM ${qualified("orders")} WHERE order_id = $1`,
    [created.orderId],
  );

  const updated = await editOrder(
    created.orderId,
    {
      expectedUpdatedAt: new Date(current.rows[0].updated_at).toISOString(),
      deliveryAddress: "Москва, ул. Чайная, д. 1",
      managerComment: null,
      items: [{ productId: "product-1", quantity: 250 }],
    },
    persistence,
  );

  const product = await pool.query(
    `SELECT stock FROM ${qualified("products")} WHERE product_id = 'product-1'`,
  );
  assert.equal(updated.lines[0]?.quantity, 250);
  assert.equal(product.rows[0].stock, 0);
});
