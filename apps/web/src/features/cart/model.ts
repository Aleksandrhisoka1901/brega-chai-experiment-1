import { CART_VERSION } from "./types.ts";
import type { Cart, CartItem, CartProduct } from "./types.ts";
import { DEFAULT_MAX_ITEM_QUANTITY } from "@brega-chai/contracts";

export const MAX_ITEM_QUANTITY = DEFAULT_MAX_ITEM_QUANTITY;

export function createEmptyCart(): Cart {
  return { version: CART_VERSION, items: [] };
}

function assertQuantity(
  quantity: number,
  stock: number,
  maxItemQuantity: number,
): void {
  const maximum = Math.min(maxItemQuantity, stock);

  if (
    !Number.isInteger(quantity) ||
    !Number.isInteger(stock) ||
    quantity < 1 ||
    quantity > maximum
  ) {
    throw new RangeError(
      `Quantity must be an integer between 1 and ${Math.max(0, maximum)}`,
    );
  }
}

export function addItem(
  cart: Cart,
  product: CartProduct,
  quantity: number,
  maxItemQuantity = MAX_ITEM_QUANTITY,
): Cart {
  if (cart.items.some((item) => item.productId === product.productId)) {
    return cart;
  }

  assertQuantity(quantity, product.stock, maxItemQuantity);
  const { stock: _, ...item } = product;

  return {
    ...cart,
    items: [...cart.items, { ...item, quantity }],
  };
}

export function updateItemQuantity(
  cart: Cart,
  productId: string,
  quantity: number,
  currentStock: number,
  maxItemQuantity = MAX_ITEM_QUANTITY,
): Cart {
  const index = cart.items.findIndex((item) => item.productId === productId);

  if (index === -1) {
    return cart;
  }

  const currentQuantity = cart.items[index]?.quantity;
  if (currentQuantity === quantity) {
    return cart;
  }

  const currentMaximum = Math.min(currentStock, maxItemQuantity);
  const isDownwardCorrection =
    currentQuantity !== undefined &&
    currentQuantity > currentMaximum &&
    quantity >= 1 &&
    Number.isInteger(quantity) &&
    quantity < currentQuantity;

  if (!isDownwardCorrection) {
    assertQuantity(quantity, currentStock, maxItemQuantity);
  }

  return {
    ...cart,
    items: cart.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, quantity } : item,
    ),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  const items = cart.items.filter((item) => item.productId !== productId);
  return items.length === cart.items.length ? cart : { ...cart, items };
}

export function clearCart(cart: Cart): Cart {
  return cart.items.length === 0 ? cart : createEmptyCart();
}

export function getCartQuantity(cart: Cart): number {
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(cart: Cart): number {
  return cart.items.reduce(
    (total, item) => total + item.unitPriceSnapshot * item.quantity,
    0,
  );
}

export function replaceItem(cart: Cart, item: CartItem): Cart {
  const index = cart.items.findIndex(
    (candidate) => candidate.productId === item.productId,
  );
  if (index === -1) {
    return cart;
  }

  return {
    ...cart,
    items: cart.items.map((candidate, itemIndex) =>
      itemIndex === index ? item : candidate,
    ),
  };
}
