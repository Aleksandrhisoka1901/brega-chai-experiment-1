import {
  addItem,
  clearCart,
  createEmptyCart,
  removeItem,
  updateItemQuantity,
} from "./model.ts";
import {
  createBrowserCartPersistence,
  type CartPersistence,
} from "./persistence.ts";
import type { Cart, CartProduct } from "./types.ts";

type Listener = () => void;

export interface CartStore {
  getSnapshot(): Cart;
  getServerSnapshot(): Cart;
  subscribe(listener: Listener): () => void;
  hydrate(): void;
  add(product: CartProduct, quantity: number, maxItemQuantity?: number): void;
  updateQuantity(
    productId: string,
    quantity: number,
    currentStock: number,
    maxItemQuantity?: number,
  ): void;
  remove(productId: string): void;
  clear(): void;
}

const SERVER_SNAPSHOT = createEmptyCart();

export function createCartStore(
  persistence: CartPersistence = createBrowserCartPersistence(),
): CartStore {
  let cart = createEmptyCart();
  let hydrated = false;
  const listeners = new Set<Listener>();

  const publish = (nextCart: Cart, persist: boolean) => {
    if (nextCart === cart) {
      return;
    }

    cart = nextCart;
    if (persist) {
      persistence.save(cart);
    }
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => cart,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate() {
      if (hydrated) {
        return;
      }
      hydrated = true;
      publish(persistence.load(), false);
      persistence.subscribe((externalCart) => publish(externalCart, false));
    },
    add(product, quantity, maxItemQuantity) {
      publish(addItem(cart, product, quantity, maxItemQuantity), true);
    },
    updateQuantity(productId, quantity, currentStock, maxItemQuantity) {
      publish(
        updateItemQuantity(
          cart,
          productId,
          quantity,
          currentStock,
          maxItemQuantity,
        ),
        true,
      );
    },
    remove(productId) {
      publish(removeItem(cart, productId), true);
    },
    clear() {
      const nextCart = clearCart(cart);
      if (nextCart !== cart) {
        cart = nextCart;
        persistence.clear();
        listeners.forEach((listener) => listener());
      }
    },
  };
}
