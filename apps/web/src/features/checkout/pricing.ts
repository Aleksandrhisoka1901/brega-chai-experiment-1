import {
  calculateDiscountedTotalRubles,
  type DeliveryMethod,
} from "@brega-chai/contracts";

export function getCheckoutPricing(
  standardTotal: number,
  deliveryMethod: DeliveryMethod | undefined,
  configuredPickupDiscount: number | null | undefined,
) {
  const discountPercent =
    deliveryMethod === "pickup" ? (configuredPickupDiscount ?? 0) : 0;
  const hasDiscount = discountPercent > 0;

  return {
    discountPercent,
    discountedTotal: hasDiscount
      ? calculateDiscountedTotalRubles(standardTotal, discountPercent)
      : standardTotal,
    hasDiscount,
  };
}
