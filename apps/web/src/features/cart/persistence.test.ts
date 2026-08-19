import assert from "node:assert/strict";
import test from "node:test";

import { CART_STORAGE_KEY, createCartPersistence } from "./persistence.ts";
import { createEmptyCart } from "./model.ts";
import type { Cart } from "./types.ts";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const validCart: Cart = {
  version: 1,
  items: [
    {
      productId: "product-1",
      slug: "tea",
      type: "tovar",
      title: "Tea",
      packageLabel: "50 г",
      unitPriceSnapshot: 1200,
      currency: "RUB",
      image: { url: "/tea.png", alt: "Tea" },
      quantity: 2,
    },
  ],
};

test("round-trips a valid versioned cart", () => {
  const storage = new MemoryStorage();
  const persistence = createCartPersistence({ storage });

  persistence.save(validCart);

  assert.equal(storage.values.has(CART_STORAGE_KEY), true);
  assert.deepEqual(persistence.load(), validCart);
});

test("resets corrupted, old, unsafe and PII-bearing payloads", () => {
  const invalidPayloads = [
    "{broken",
    JSON.stringify({ ...validCart, version: 0 }),
    JSON.stringify({
      ...validCart,
      items: [{ ...validCart.items[0], quantity: 101 }],
    }),
    JSON.stringify({ ...validCart, email: "person@example.test" }),
  ];

  for (const payload of invalidPayloads) {
    const storage = new MemoryStorage();
    storage.setItem(CART_STORAGE_KEY, payload);
    const persistence = createCartPersistence({ storage });

    assert.deepEqual(persistence.load(), createEmptyCart());
    assert.equal(storage.getItem(CART_STORAGE_KEY), null);
  }
});

test("keeps quantities above the default for a larger published limit", () => {
  const storage = new MemoryStorage();
  const persistence = createCartPersistence({ storage });
  const cart = {
    ...validCart,
    items: [{ ...validCart.items[0]!, quantity: 8 }],
  };

  persistence.save(cart);

  assert.deepEqual(persistence.load(), cart);
});

test("works without browser storage during SSR", () => {
  const persistence = createCartPersistence();

  assert.deepEqual(persistence.load(), createEmptyCart());
  assert.doesNotThrow(() => persistence.save(validCart));
});
