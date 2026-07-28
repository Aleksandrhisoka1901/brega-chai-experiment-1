import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);
const rubleAmountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const positiveRubleAmountSchema = rubleAmountSchema.refine(
  (amount) => amount > 0,
  "Price must be greater than zero",
);
const orderQuantitySchema = z.number().int().min(1).max(5);
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
    name: nonEmptyStringSchema,
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Phone must use E.164 format"),
    email: z.string().trim().pipe(z.email()).optional(),
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
    deliveryAddress: nonEmptyStringSchema,
    comment: z.string().trim().optional(),
    consents: orderConsentsSchema,
    items: z.array(orderItemInputSchema).min(1),
  })
  .strict()
  .superRefine(({ items }, context) => {
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
): boolean {
  return (
    orderQuantitySchema.safeParse(quantity).success &&
    stockSchema.safeParse(stock).success &&
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

export const orderResultSchema = z
  .object({
    orderId: nonEmptyStringSchema,
    status: orderStatusSchema,
    currency: z.literal("RUB"),
    lines: z.array(orderLineSnapshotSchema).min(1),
    totalRubles: positiveRubleAmountSchema,
  })
  .strict()
  .superRefine(({ lines, totalRubles }, context) => {
    const expectedTotal = lines.reduce(
      (total, line) => total + line.lineTotalRubles,
      0,
    );
    if (!Number.isSafeInteger(expectedTotal) || totalRubles !== expectedTotal) {
      context.addIssue({
        code: "custom",
        message: "Order total must equal the sum of its lines",
        path: ["totalRubles"],
      });
    }
  });

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type OrderConsents = z.infer<typeof orderConsentsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderLineSnapshot = z.infer<typeof orderLineSnapshotSchema>;
export type OrderResult = z.infer<typeof orderResultSchema>;
