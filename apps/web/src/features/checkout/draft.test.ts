import assert from "node:assert/strict";
import test from "node:test";

import { CHECKOUT_DRAFT_KEY, createCheckoutDraftPersistence } from "./draft.ts";

class MemoryStorage {
  values = new Map<string, string>();
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

test("round-trips contact draft but never stores consents", () => {
  const storage = new MemoryStorage();
  const persistence = createCheckoutDraftPersistence(storage);
  persistence.save({
    name: "Анна",
    phone: "+79991234567",
    email: "anna@example.test",
    deliveryAddress: "Москва",
    comment: "После 18:00",
    privacyConsent: true,
    termsConsent: true,
  });

  assert.deepEqual(persistence.load(), {
    name: "Анна",
    phone: "+79991234567",
    email: "anna@example.test",
    deliveryAddress: "Москва",
    comment: "После 18:00",
  });
  assert.equal(
    storage.values.get(CHECKOUT_DRAFT_KEY)?.includes("Consent"),
    false,
  );
});

test("corrupted draft safely resets", () => {
  const storage = new MemoryStorage();
  storage.setItem(CHECKOUT_DRAFT_KEY, "{broken");
  const persistence = createCheckoutDraftPersistence(storage);

  assert.deepEqual(persistence.load(), {});
  assert.equal(storage.getItem(CHECKOUT_DRAFT_KEY), null);
});
