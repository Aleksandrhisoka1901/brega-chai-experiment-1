import { z } from "zod";
import { MAX_ORDER_ITEM_QUANTITY } from "@brega-chai/contracts";

import { createEmptyCart } from "./model.ts";
import { CART_VERSION } from "./types.ts";
import type { Cart } from "./types.ts";

export const CART_STORAGE_KEY = `brega-chai:cart:v${CART_VERSION}`;

const cartImageSchema = z
  .object({
    url: z.string().min(1),
    alt: z.string(),
  })
  .strict();

const cartItemSchema = z
  .object({
    productId: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(["nabor", "tovar"]),
    title: z.string().min(1),
    packageLabel: z.string().min(1),
    unitPriceSnapshot: z.number().int().positive(),
    currency: z.literal("RUB"),
    image: cartImageSchema,
    quantity: z.number().int().min(1).max(MAX_ORDER_ITEM_QUANTITY),
  })
  .strict();

const cartSchema = z
  .object({
    version: z.literal(CART_VERSION),
    items: z.array(cartItemSchema),
  })
  .strict();

export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StorageEventSource {
  addEventListener(
    type: "storage",
    listener: (event: StorageEvent) => void,
  ): void;
  removeEventListener(
    type: "storage",
    listener: (event: StorageEvent) => void,
  ): void;
}

export interface CartPersistence {
  load(): Cart;
  save(cart: Cart): void;
  clear(): void;
  subscribe(listener: (cart: Cart) => void): () => void;
}

export function createCartPersistence({
  storage,
  eventSource,
}: {
  storage?: CartStorage;
  eventSource?: StorageEventSource;
} = {}): CartPersistence {
  const reset = () => {
    storage?.removeItem(CART_STORAGE_KEY);
    return createEmptyCart();
  };

  const load = (): Cart => {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return createEmptyCart();
    }

    try {
      const parsed = cartSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : reset();
    } catch {
      return reset();
    }
  };

  return {
    load,
    save(cart) {
      storage?.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartSchema.parse(cart)),
      );
    },
    clear() {
      storage?.removeItem(CART_STORAGE_KEY);
    },
    subscribe(listener) {
      if (!eventSource) {
        return () => {};
      }

      const onStorage = (event: StorageEvent) => {
        if (event.key === CART_STORAGE_KEY) {
          listener(load());
        }
      };
      eventSource.addEventListener("storage", onStorage);
      return () => eventSource.removeEventListener("storage", onStorage);
    },
  };
}

export function createBrowserCartPersistence(): CartPersistence {
  if (typeof window === "undefined") {
    return createCartPersistence();
  }

  return createCartPersistence({
    storage: window.localStorage,
    eventSource: window,
  });
}
