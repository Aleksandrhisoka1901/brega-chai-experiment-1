export function getMaximumProductQuantity(stock: number, maxItemQuantity = 5) {
  return Math.min(maxItemQuantity, Math.max(0, stock));
}

export function getInitialProductQuantity(stock: number) {
  return stock > 0 ? 1 : 0;
}

export function updateProductQuantity(
  current: number,
  delta: -1 | 1,
  maximum: number,
) {
  if (maximum === 0) return 0;
  return Math.min(maximum, Math.max(1, current + delta));
}

export function resolveProductQuantityChange({
  selectedQuantity,
  cartQuantity,
  delta,
  maximum,
}: {
  selectedQuantity: number;
  cartQuantity?: number;
  delta: -1 | 1;
  maximum: number;
}) {
  return {
    quantity: updateProductQuantity(
      cartQuantity ?? selectedQuantity,
      delta,
      maximum,
    ),
    target:
      cartQuantity === undefined ? ("selection" as const) : ("cart" as const),
  };
}
