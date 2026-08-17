import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrder,
  editOrder,
  OrderServiceError,
  transitionOrderStatus,
  type LockedProduct,
  type OrderPersistence,
  type OrderEditPatch,
  type OrderEditPersistence,
  type OrderEditTransactionRepository,
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
  deliveryMethod: "courier",
  deliveryAddress: "Москва, ул. Чайная, д. 1",
  consents: {
    personalData: { accepted: true, documentVersion: "2026-07-28" },
    salesAndDelivery: { accepted: true, documentVersion: "2026-07-28" },
  },
  items: [{ productId: "product-1", quantity: 2 }],
};

const checkoutSettings = {
  pickupAddress: "г. Москва, ул. Чайная, д. 1. Ежедневно с 10:00 до 22:00.",
  pickupDiscountPercent: 10,
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
      decrementStock: async (productId, quantity) => {
        const entry = products.get(productId);
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
          orderNumber: `2607-${String(sequence).padStart(4, "0")}`,
          updatedAt: "2026-08-03T10:00:00.000Z",
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

class MemoryEditPersistence implements OrderEditPersistence {
  private readonly state: MemoryPersistence;
  private revision = 0;

  constructor(state: MemoryPersistence) {
    this.state = state;
  }

  async transaction<T>(
    _orderId: string,
    operation: (repository: OrderEditTransactionRepository) => Promise<T>,
  ): Promise<T> {
    const products = new Map(
      [...this.state.products].map(([id, value]) => [id, { ...value }]),
    );
    const orders = new Map(
      [...this.state.orders].map(([key, value]) => [
        key,
        { ...value, lines: value.lines.map((line) => ({ ...line })) },
      ]),
    );
    const repository: OrderEditTransactionRepository = {
      lockOrder: async (orderId) =>
        [...orders.values()].find((order) => order.orderId === orderId) ?? null,
      lockProducts: async (productIds) =>
        productIds.flatMap((id) => {
          const value = products.get(id);
          return value?.published ? [{ ...value }] : [];
        }),
      decrementStock: async (productId, quantity) => {
        const entry = products.get(productId);
        if (!entry || entry.stock < quantity) return false;
        entry.stock -= quantity;
        return true;
      },
      restoreStock: async (productId, quantity) => {
        const entry = products.get(productId);
        if (!entry) return false;
        entry.stock += quantity;
        return true;
      },
      updateOrder: async (orderId, patch: OrderEditPatch) => {
        const entry = [...orders.values()].find(
          (order) => order.orderId === orderId,
        );
        if (!entry) return null;
        Object.assign(entry, patch, {
          updatedAt: `2026-08-03T10:00:0${++this.revision}.000Z`,
        });
        return entry;
      },
    };

    const result = await operation(repository);
    this.state.products = products;
    this.state.orders = orders;
    return result;
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
      lockExistingProductIds: async (productIds) =>
        productIds.filter((productId) => products.has(productId)),
      restoreStock: async (productId, quantity) => {
        const entry = products.get(productId);
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
  const result = await createOrder(request, persistence, checkoutSettings);

  assert.equal(result.status, "new");
  assert.equal(result.orderNumber, "2607-0001");
  assert.equal(result.currency, "RUB");
  assert.equal(result.totalRubles, 3200);
  assert.equal(result.deliveryMethod, "courier");
  assert.equal(result.pickupDiscountPercent, 0);
  assert.equal(result.discountedTotalRubles, 3200);
  assert.equal(result.lines[0]?.unitPriceRubles, 1600);
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("snapshots pickup address, discount and both server totals", async () => {
  const persistence = new MemoryPersistence();
  const { deliveryAddress: _deliveryAddress, ...pickupRequest } = request;
  const result = await createOrder(
    { ...pickupRequest, deliveryMethod: "pickup" },
    persistence,
    checkoutSettings,
  );

  assert.equal(result.deliveryMethod, "pickup");
  assert.equal(result.pickupDiscountPercent, 10);
  assert.equal(result.totalRubles, 3200);
  assert.equal(result.discountedTotalRubles, 2880);
  const stored = [...persistence.orders.values()][0];
  assert.equal(stored?.deliveryAddress, checkoutSettings.pickupAddress);
  assert.equal(stored?.discountedTotalRubles, 2880);
});

test("keeps the standard pickup total when no discount is configured", async () => {
  const persistence = new MemoryPersistence();
  const { deliveryAddress: _deliveryAddress, ...pickupRequest } = request;
  const result = await createOrder(
    { ...pickupRequest, deliveryMethod: "pickup" },
    persistence,
    { ...checkoutSettings, pickupDiscountPercent: null },
  );

  assert.equal(result.pickupDiscountPercent, 0);
  assert.equal(result.totalRubles, 3200);
  assert.equal(result.discountedTotalRubles, 3200);
});

test("requires a courier address and valid server checkout settings", async () => {
  const persistence = new MemoryPersistence();
  const { deliveryAddress: _deliveryAddress, ...missingAddress } = request;

  await assert.rejects(
    createOrder(missingAddress, persistence, checkoutSettings),
    (error) =>
      error instanceof OrderServiceError && error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    createOrder(request, persistence, {
      pickupAddress: "",
      pickupDiscountPercent: 10,
    }),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "ORDER_CONFIGURATION_UNAVAILABLE",
  );
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
      checkoutSettings,
    ),
    (error) =>
      error instanceof OrderServiceError && error.code === "INVALID_INPUT",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});

test("returns the same order for the same idempotency key and payload", async () => {
  const persistence = new MemoryPersistence();
  const first = await createOrder(request, persistence, checkoutSettings);
  const repeated = await createOrder(request, persistence, {
    pickupAddress: "Новый адрес, который не должен изменить заказ",
    pickupDiscountPercent: 25,
  });

  assert.deepEqual(repeated, first);
  assert.equal(persistence.orders.size, 1);
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("rejects an idempotency key reused with a different payload", async () => {
  const persistence = new MemoryPersistence();
  await createOrder(request, persistence, checkoutSettings);

  await assert.rejects(
    createOrder(
      {
        ...request,
        deliveryAddress: "Санкт-Петербург, Невский проспект, д. 1",
      },
      persistence,
      checkoutSettings,
    ),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 1);
});

test("rejects missing, unpublished and insufficient products", async () => {
  for (const [candidate, code] of [
    [undefined, "PRODUCT_NOT_FOUND"],
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
      createOrder(request, persistence, checkoutSettings),
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
      createOrder(request, persistence, checkoutSettings),
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

  await assert.rejects(
    createOrder(request, persistence, checkoutSettings),
    /insert failed/,
  );
  assert.equal(persistence.products.get("product-1")?.stock, 3);
  assert.equal(persistence.orders.size, 0);
});

test("admin edit adds and removes lines, updates stock and recalculates totals", async () => {
  const persistence = new MemoryPersistence();
  persistence.products.set("product-2", {
    ...product,
    recordId: 2,
    productId: "product-2",
    slug: "te-guan-in-b2c3d4",
    title: "Те Гуань Инь",
    priceRubles: 900,
    stock: 4,
  });
  const created = await createOrder(request, persistence, checkoutSettings);

  const updated = await editOrder(
    created.orderId,
    {
      expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
      deliveryAddress: "Москва, новый адрес",
      managerComment: "Дополнительный телефон: +79990000000",
      items: [{ productId: "product-2", quantity: 2 }],
    },
    new MemoryEditPersistence(persistence),
  );

  assert.equal(updated.lines.length, 1);
  assert.equal(updated.lines[0]?.title, "Те Гуань Инь");
  assert.equal(updated.totalRubles, 1800);
  assert.equal(updated.discountedTotalRubles, 1800);
  assert.equal(updated.deliveryAddress, "Москва, новый адрес");
  assert.equal(updated.managerComment, "Дополнительный телефон: +79990000000");
  assert.equal(persistence.products.get("product-1")?.stock, 3);
  assert.equal(persistence.products.get("product-2")?.stock, 2);
});

test("admin edit preserves snapshot price for an existing line", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  persistence.products.get("product-1")!.priceRubles = 2000;

  const updated = await editOrder(
    created.orderId,
    {
      expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
      deliveryAddress: request.deliveryAddress,
      managerComment: null,
      items: [{ productId: "product-1", quantity: 3 }],
    },
    new MemoryEditPersistence(persistence),
  );

  assert.equal(updated.lines[0]?.unitPriceRubles, 1600);
  assert.equal(updated.lines[0]?.lineTotalRubles, 4800);
  assert.equal(updated.totalRubles, 4800);
  assert.equal(persistence.products.get("product-1")?.stock, 0);
});

test("admin edit rejects stale, terminal and insufficient-stock changes", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  const editPersistence = new MemoryEditPersistence(persistence);
  const command = {
    expectedUpdatedAt: "2026-08-03T09:59:59.000Z",
    deliveryAddress: request.deliveryAddress,
    managerComment: null,
    items: [{ productId: "product-1", quantity: 3 }],
  };

  await assert.rejects(
    editOrder(created.orderId, command, editPersistence),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "ORDER_VERSION_CONFLICT",
  );

  command.expectedUpdatedAt = "2026-08-03T10:00:00.000Z";
  command.items[0]!.quantity = 4;
  await assert.rejects(
    editOrder(created.orderId, command, editPersistence),
    (error) =>
      error instanceof OrderServiceError && error.code === "INSUFFICIENT_STOCK",
  );
  assert.equal(persistence.products.get("product-1")?.stock, 1);

  [...persistence.orders.values()][0]!.status = "completed";
  command.items[0]!.quantity = 2;
  await assert.rejects(
    editOrder(created.orderId, command, editPersistence),
    (error) =>
      error instanceof OrderServiceError && error.code === "ORDER_NOT_EDITABLE",
  );
});

test("cancelling restores every line exactly once", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
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

test("cancellation follows the stable product id after a published row changes", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  persistence.products.get("product-1")!.recordId = 99;

  const cancelled = await transitionOrderStatus(
    created.orderId,
    "cancelled",
    new MemoryStatusPersistence(persistence),
  );

  assert.equal(cancelled.status, "cancelled");
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});

test("cancellation bypasses stock restore for a fully deleted product", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  persistence.products.delete("product-1");

  const cancelled = await transitionOrderStatus(
    created.orderId,
    "cancelled",
    new MemoryStatusPersistence(persistence),
  );

  assert.equal(cancelled.status, "cancelled");
  assert.equal(
    [...persistence.orders.values()][0]?.statusHistory.at(-1)?.to,
    "cancelled",
  );
});

test("confirmation rejects an order containing a deleted product", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  persistence.products.delete("product-1");

  await assert.rejects(
    transitionOrderStatus(
      created.orderId,
      "confirmed",
      new MemoryStatusPersistence(persistence),
    ),
    (error) =>
      error instanceof OrderServiceError && error.code === "PRODUCT_NOT_FOUND",
  );
  assert.equal([...persistence.orders.values()][0]?.status, "new");
});

test("allows only approved status transitions and rolls back failed restore", async () => {
  const persistence = new MemoryPersistence();
  const created = await createOrder(request, persistence, checkoutSettings);
  const statusPersistence = new MemoryStatusPersistence(persistence);

  await assert.rejects(
    transitionOrderStatus(created.orderId, "completed", statusPersistence),
    (error) =>
      error instanceof OrderServiceError &&
      error.code === "INVALID_STATUS_TRANSITION",
  );

  const actor = { id: "7", name: "Анна Менеджер" };
  await transitionOrderStatus(
    created.orderId,
    "confirmed",
    statusPersistence,
    actor,
  );
  assert.deepEqual(
    [...persistence.orders.values()][0]?.statusHistory.at(-1)?.actor,
    actor,
  );
  await transitionOrderStatus(created.orderId, "cancelled", statusPersistence);
  assert.equal(persistence.products.get("product-1")?.stock, 3);
});
