import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);
export const checkoutFieldLimits = {
  name: 100,
  phone: 16,
  phoneInput: 32,
  email: 254,
  deliveryAddress: 500,
  comment: 1_000,
} as const;
export const deliveryMethodSchema = z.enum(["pickup", "courier"]);
export const pickupDiscountPercentSchema = z.number().int().min(0).max(100);
export const DEFAULT_MAX_ITEM_QUANTITY = 5;
export const MAX_ORDER_ITEM_QUANTITY = 100;
export const maxItemQuantitySchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ORDER_ITEM_QUANTITY);
const rubleAmountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const positiveRubleAmountSchema = rubleAmountSchema.refine(
  (amount) => amount > 0,
  "Price must be greater than zero",
);
const orderQuantitySchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ORDER_ITEM_QUANTITY);
export const stockSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

export const orderItemInputSchema = z
  .object({
    productId: nonEmptyStringSchema,
    quantity: orderQuantitySchema,
  })
  .strict();

export const customerDetailsSchema = z
  .object({
    name: nonEmptyStringSchema.max(checkoutFieldLimits.name),
    phone: z
      .string()
      .trim()
      .max(checkoutFieldLimits.phone)
      .regex(/^\+[1-9]\d{7,14}$/, "Phone must use E.164 format"),
    email: z
      .string()
      .trim()
      .max(checkoutFieldLimits.email)
      .pipe(z.email())
      .optional(),
  })
  .strict();

const acceptedConsentSchema = z
  .object({
    accepted: z.literal(true),
    documentVersion: nonEmptyStringSchema,
  })
  .strict();

export const orderConsentsSchema = z
  .object({
    personalData: acceptedConsentSchema,
    salesAndDelivery: acceptedConsentSchema,
  })
  .strict();

export const createOrderInputSchema = z
  .object({
    idempotencyKey: z.uuid(),
    customer: customerDetailsSchema,
    deliveryMethod: deliveryMethodSchema,
    deliveryAddress: nonEmptyStringSchema
      .max(checkoutFieldLimits.deliveryAddress)
      .optional(),
    comment: z.string().trim().max(checkoutFieldLimits.comment).optional(),
    consents: orderConsentsSchema,
    items: z.array(orderItemInputSchema).min(1),
  })
  .strict()
  .superRefine(({ deliveryAddress, deliveryMethod, items }, context) => {
    if (deliveryMethod === "courier" && !deliveryAddress) {
      context.addIssue({
        code: "custom",
        message: "Delivery address is required for courier delivery",
        path: ["deliveryAddress"],
      });
    }

    const seenProductIds = new Set<string>();

    items.forEach((item, index) => {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          message: "A product may appear only once per order",
          path: ["items", index, "productId"],
        });
      }
      seenProductIds.add(item.productId);
    });
  });

export function isOrderQuantityAvailable(
  quantity: number,
  stock: number,
  maxItemQuantity = DEFAULT_MAX_ITEM_QUANTITY,
): boolean {
  return (
    orderQuantitySchema.safeParse(quantity).success &&
    stockSchema.safeParse(stock).success &&
    maxItemQuantitySchema.safeParse(maxItemQuantity).success &&
    quantity <= maxItemQuantity &&
    quantity <= stock
  );
}

export const orderStatusSchema = z.enum([
  "new",
  "confirmed",
  "completed",
  "cancelled",
]);

const allowedStatusTransitions: Readonly<
  Record<
    z.infer<typeof orderStatusSchema>,
    ReadonlySet<z.infer<typeof orderStatusSchema>>
  >
> = {
  new: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["completed", "cancelled"]),
  completed: new Set(),
  cancelled: new Set(),
};

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  return allowedStatusTransitions[current].has(next);
}

export const orderLineSnapshotSchema = z
  .object({
    productId: nonEmptyStringSchema,
    slug: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    packageLabel: nonEmptyStringSchema,
    unitPriceRubles: positiveRubleAmountSchema,
    quantity: orderQuantitySchema,
    lineTotalRubles: positiveRubleAmountSchema,
    currency: z.literal("RUB"),
  })
  .strict()
  .superRefine((line, context) => {
    const expectedTotal = line.unitPriceRubles * line.quantity;
    if (
      !Number.isSafeInteger(expectedTotal) ||
      line.lineTotalRubles !== expectedTotal
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Line total must equal the server price multiplied by quantity",
        path: ["lineTotalRubles"],
      });
    }
  });

export function calculateDiscountedTotalRubles(
  totalRubles: number,
  discountPercent: number,
): number {
  if (!Number.isSafeInteger(totalRubles) || totalRubles < 0) {
    throw new RangeError("Total must be a non-negative integer");
  }
  const discount = pickupDiscountPercentSchema.parse(discountPercent);
  return Math.round((totalRubles * (100 - discount)) / 100);
}

export const orderResultSchema = z
  .object({
    orderId: nonEmptyStringSchema,
    orderNumber: nonEmptyStringSchema,
    status: orderStatusSchema,
    deliveryMethod: deliveryMethodSchema,
    pickupDiscountPercent: pickupDiscountPercentSchema,
    currency: z.literal("RUB"),
    lines: z.array(orderLineSnapshotSchema).min(1),
    totalRubles: positiveRubleAmountSchema,
    discountedTotalRubles: rubleAmountSchema,
  })
  .strict()
  .superRefine(
    (
      {
        deliveryMethod,
        discountedTotalRubles,
        lines,
        pickupDiscountPercent,
        totalRubles,
      },
      context,
    ) => {
      const expectedTotal = lines.reduce(
        (total, line) => total + line.lineTotalRubles,
        0,
      );
      if (
        !Number.isSafeInteger(expectedTotal) ||
        totalRubles !== expectedTotal
      ) {
        context.addIssue({
          code: "custom",
          message: "Order total must equal the sum of its lines",
          path: ["totalRubles"],
        });
      }

      const expectedDiscountPercent =
        deliveryMethod === "pickup" ? pickupDiscountPercent : 0;
      if (
        deliveryMethod === "courier" &&
        pickupDiscountPercent !== expectedDiscountPercent
      ) {
        context.addIssue({
          code: "custom",
          message: "Courier orders cannot have a pickup discount",
          path: ["pickupDiscountPercent"],
        });
      }

      const expectedDiscountedTotal = calculateDiscountedTotalRubles(
        totalRubles,
        expectedDiscountPercent,
      );
      if (discountedTotalRubles !== expectedDiscountedTotal) {
        context.addIssue({
          code: "custom",
          message: "Discounted total must match the stored discount snapshot",
          path: ["discountedTotalRubles"],
        });
      }
    },
  );

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type OrderConsents = z.infer<typeof orderConsentsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderLineSnapshot = z.infer<typeof orderLineSnapshotSchema>;
export type OrderResult = z.infer<typeof orderResultSchema>;
