import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrder,
  OrderServiceError,
  transitionOrderStatus,
  type LockedProduct,
  type OrderPersistence,
  type OrderStatusPersistence,
  type OrderStatusTransactionRepository,
  type StoredOrder,
  type TransactionRepository,
} from "../src/api/order/services/order-domain.ts";

const request = {
  idempotencyKey: "d9428888-122b-4dbb-bc09-3d1464b35f9d",
  customer: {
    name: "Анна",
    phone: "+79991234567",
  },
  deliveryAddress: "Москва, ул. Чайная, д. 1",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
};

const product: LockedProduct = {
  recordId: 1,
  productId: "product-1",
  slug: "da-hun-pao-a1b2c3",
  title: "Да Хун Пао",
  packageLabel: "50 г",
  priceRubles: 1600,
  currency: "RUB",
  stock: 3,
  active: true,
  published: true,
};

class MemoryPersistence implements OrderPersistence {
  products = new Map([[product.productId, { ...product }]]);
  orders = new Map<string, StoredOrder>();
  failCreate = false;

  async transaction<T>(
    _idempotencyKey: string,
    operation: (repository: TransactionRepository) => Promise<T>,
  ): Promise<T> {
    const products = new Map(
      [...this.products].map(([id, value]) => [id, { ...value }]),
    );
    const orders = new Map(this.orders);
    let sequence = orders.size;

    const repository: TransactionRepository = {
      findOrderByIdempotencyKey: async (key) => orders.get(key) ?? null,
      lockProducts: async (productIds) =>
        productIds.flatMap((id) => {
          const value = products.get(id);
          return value ? [{ ...value }] : [];
        }),
      decrementStock: async (recordId, quantity) => {
        const entry = [...products.values()].find(
          (candidate) => candidate.recordId === recordId,
        );
        if (!entry || entry.stock < quantity) return false;
        entry.stock -= quantity;
        return true;
      },
      insertOrder: async (draft) => {
        if (this.failCreate) throw new Error("insert failed");
        sequence += 1;
        const stored = {
          ...draft,
          orderId: `order-${sequence}`,
          orderNumber: `BC-${sequence}`,
        };
        orders.set(stored.idempotencyKey, stored);
        return stored;
      },
    };

    try {
      const result = await operation(repository);
      this.products = products;
      this.orders = orders;
      return result;
    } catch (error) {
      throw error;
    }
  }
}

class MemoryStatusPersistence implements OrderStatusPersistence {
  private readonly state: MemoryPersistence;

  constructor(state: MemoryPersistence) {
    this.state = state;
  }

  async transaction<T>(
    _orderId: string,
    operation: (repository: OrderStatusTransactionRepository) => Promise<T>,
  ): Promise<T> {
    const products = new Map(
      [...this.state.products].map(([id, value]) => [id, { ...value }]),
    );
    const orders = new Map(
      [...this.state.orders].map(([key, value]) => [
        key,
        {
          ...value,
          lines: value.lines.map((line) => ({ ...line })),
          statusHistory: [...value.statusHistory],
        },
      ]),
    );

    const repository: OrderStatusTransactionRepository = {
      lockOrder: async (orderId) =>
        [...orders.values()].find((order) => order.orderId === orderId) ?? null,
      restoreStock: async (recordId, quantity) => {
        const entry = [...products.values()].find(
          (candidate) => candidate.recordId === recordId,
        );
        if (!entry) return false;
        entry.stock += quantity;
        return true;
      },
      updateStatus: async (orderId, status, statusHistory) => {
        const entry = [...orders.values()].find(
          (order) => order.orderId === orderId,
        );
        if (!entry) return null;
        entry.status = status;
        entry.statusHistory = statusHistory;
        return entry;
      },
    };

    try {
      const result = await operation(repository);
      this.state.products = products;
      this.state.orders = orders;
      return result;
    } catch (error) {
      throw error;
    }
  }
}

test("creates RUB snapshots from locked server products and decrements stock", async () => {
  const persistence = new MemoryPersistence();
  const result = await createOrder(request, persistence);

  assert.equal(result.status, "new");
  assert.equal(result.currency, "RUB");
  assert.equal(result.totalRubles, 3200);
  assert.equal(result.lines[0]?.unitPriceRubles, 1600);
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("strictly rejects client commercial values", async () => {
  const persistence = new MemoryPersistence();

  await assert.rejects(
    createOrder(
      {
        ...request,
        items: [
          {
            productId: "product-1",
            quantity: 2,
            unitPriceRubles: 1,
          },
        ],
      },
      persistence,
    ),
    (error) =>
      error instanceof OrderServiceError && error.code === "INVALID_INPUT",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});

test("returns the same order for the same idempotency key and payload", async () => {
  const persistence = new MemoryPersistence();
  const first = await createOrder(request, persistence);
  const repeated = await createOrder(request, persistence);

  assert.deepEqual(repeated, first);
  assert.equal(persistence.orders.size, 1);
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("rejects an idempotency key reused with a different payload", async () => {
  const persistence = new MemoryPersistence();
  await createOrder(request, persistence);

  await assert.rejects(
    createOrder(
      {
        ...request,
        deliveryAddress: "Санкт-Петербург, Невский проспект, д. 1",
      },
      persistence,
    ),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("rejects missing, inactive, unpublished and insufficient products", async () => {
  for (const [candidate, code] of [
    [undefined, "PRODUCT_NOT_FOUND"],
    [{ ...product, active: false }, "PRODUCT_UNAVAILABLE"],
    [{ ...product, published: false }, "PRODUCT_UNAVAILABLE"],
    [{ ...product, stock: 1 }, "INSUFFICIENT_STOCK"],
  ] as const) {
    const persistence = new MemoryPersistence();
    if (candidate) {
      persistence.products.set(candidate.productId, candidate);
    } else {
      persistence.products.clear();
    }

    await assert.rejects(
      createOrder(request, persistence),
      (error) => error instanceof OrderServiceError && error.code === code,
    );
  }
});

test("rejects invalid server prices and currency before decrementing stock", async () => {
  for (const candidate of [
    { ...product, priceRubles: 1600.5 },
    { ...product, priceRubles: 0 },
    { ...product, currency: "USD" },
  ]) {
    const persistence = new MemoryPersistence();
    persistence.products.set(product.productId, candidate);

    await assert.rejects(
      createOrder(request, persistence),
      (error) =>
        error instanceof OrderServiceError &&
        error.code === "PRODUCT_UNAVAILABLE",
    );
    assert.equal(persistence.products.get("product-1")?.stock, 3);
  }
});

test("rolls back stock when order persistence fails", async () => {
  const persistence = new MemoryPersistence();
  persistence.failCreate = true;

  await assert.rejects(createOrder(request, persistence), /insert failed/);
  assert.equal(persistence.products.get("product-1")?.stock, 3);
  assert.equal(persistence.orders.size, 0);
});

test("cancelling restores every line exactly once", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence);
  const statusPersistence = new MemoryStatusPersistence(persistence);

  const cancelled = await transitionOrderStatus(
    created.orderId,
    "cancelled",
    statusPersistence,
  );
  assert.equal(cancelled.status, "cancelled");
  assert.equal(persistence.products.get("product-1")?.stock, 3);

  await assert.rejects(
    transitionOrderStatus(created.orderId, "cancelled", statusPersistence),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "INVALID_STATUS_TRANSITION",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});

test("allows only approved status transitions and rolls back failed restore", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence);
  const statusPersistence = new MemoryStatusPersistence(persistence);

  await assert.rejects(
    transitionOrderStatus(created.orderId, "completed", statusPersistence),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "INVALID_STATUS_TRANSITION",
  );

  await transitionOrderStatus(created.orderId, "confirmed", statusPersistence);
  await transitionOrderStatus(created.orderId, "cancelled", statusPersistence);
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});
