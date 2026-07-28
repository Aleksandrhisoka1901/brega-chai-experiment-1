export function getMaximumProductQuantity(stock: number) {
  return Math.min(5, Math.max(0, stock));
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
