import { MAX_ITEM_QUANTITY } from "../model.ts";
import type { CartItem } from "../types.ts";

export type CartItemAvailability =
  | "unknown"
  | "available"
  | "insufficient"
  | "unavailable";

export function getCartItemAvailability(
  item: CartItem,
  currentStock?: number,
): CartItemAvailability {
  if (currentStock === undefined) return "unknown";
  if (currentStock === 0) return "unavailable";
  if (currentStock < item.quantity) return "insufficient";
  return "available";
}

export function getQuantityControlState(item: CartItem, currentStock?: number) {
  const maximum =
    currentStock === undefined
      ? MAX_ITEM_QUANTITY
      : Math.min(MAX_ITEM_QUANTITY, currentStock);

  return {
    canDecrease: item.quantity > 1,
    canIncrease: item.quantity < maximum,
    maximum,
  };
}
