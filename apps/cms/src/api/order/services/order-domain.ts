import { createHash } from "node:crypto";

import {
  canTransitionOrderStatus,
  calculateDiscountedTotalRubles,
  createOrderInputSchema,
  isOrderQuantityAvailable,
  orderResultSchema,
  orderStatusSchema,
  type CreateOrderInput,
  type DeliveryMethod,
  type OrderLineSnapshot,
  type OrderResult,
  type OrderStatus,
} from "@brega-chai/contracts";
import { z } from "zod";

export type OrderServiceErrorCode =
  | "INVALID_INPUT"
  | "ORDER_CONFIGURATION_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_EDITABLE"
  | "ORDER_VERSION_CONFLICT"
  | "INVALID_STATUS"
  | "INVALID_STATUS_TRANSITION"
  | "STOCK_RESTORE_FAILED";

export class OrderServiceError extends Error {
  readonly code: OrderServiceErrorCode;
  readonly details?: { productId?: string };

  constructor(
    code: OrderServiceErrorCode,
    message: string,
    details?: { productId?: string },
  ) {
    super(message);
    this.name = "OrderServiceError";
    this.code = code;
    this.details = details;
  }
}

export interface LockedProduct {
  recordId: number;
  productId: string;
  slug: string;
  title: string;
  packageLabel: string;
  priceRubles: number;
  currency: string;
  stock: number;
  published: boolean;
}

export interface OrderDraft {
  idempotencyKey: string;
  requestFingerprint: string;
  status: "new";
  customer: CreateOrderInput["customer"];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  pickupDiscountPercent: number;
  comment?: string;
  consents: CreateOrderInput["consents"];
  lines: StoredOrderLine[];
  currency: "RUB";
  totalRubles: number;
  discountedTotalRubles: number;
  statusHistory: OrderStatusHistoryEntry[];
}

export interface StoredOrderLine extends OrderLineSnapshot {
  stockRecordId: number;
}

export interface OrderStatusHistoryEntry {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
  actor?: {
    id: string;
    name: string;
  } | null;
}

export interface StoredOrder extends Omit<OrderDraft, "status"> {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  managerComment?: string | null;
  updatedAt?: string;
}

const editOrderInputSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    deliveryAddress: z.string().trim().min(1).max(500),
    managerComment: z.string().trim().max(2000).nullable(),
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1).max(100),
            quantity: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const productIds = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate product",
          path: ["items", index, "productId"],
        });
      }
      productIds.add(item.productId);
    }
  });

export type EditOrderInput = z.infer<typeof editOrderInputSchema>;

export interface OrderCheckoutSettings {
  pickupAddress: string;
  pickupDiscountPercent?: number | null;
}

export interface OrderCreation {
  created: boolean;
  order: StoredOrder;
  result: OrderResult;
}

export interface TransactionRepository {
  findOrderByIdempotencyKey(key: string): Promise<StoredOrder | null>;
  lockProducts(productIds: string[]): Promise<LockedProduct[]>;
  decrementStock(productId: string, quantity: number): Promise<boolean>;
  insertOrder(draft: OrderDraft): Promise<StoredOrder>;
}

export interface OrderPersistence {
  transaction<T>(
    idempotencyKey: string,
    operation: (repository: TransactionRepository) => Promise<T>,
  ): Promise<T>;
}

export interface OrderStatusTransactionRepository {
  lockOrder(orderId: string): Promise<StoredOrder | null>;
  lockExistingProductIds(productIds: string[]): Promise<string[]>;
  restoreStock(productId: string, quantity: number): Promise<boolean>;
  updateStatus(
    orderId: string,
    status: OrderStatus,
    statusHistory: OrderStatusHistoryEntry[],
  ): Promise<StoredOrder | null>;
}

export interface OrderStatusPersistence {
  transaction<T>(
    orderId: string,
    operation: (repository: OrderStatusTransactionRepository) => Promise<T>,
  ): Promise<T>;
}

export interface OrderEditPatch {
  deliveryAddress: string;
  managerComment: string | null;
  lines: StoredOrderLine[];
  totalRubles: number;
  discountedTotalRubles: number;
}

export interface OrderEditTransactionRepository {
  lockOrder(orderId: string): Promise<StoredOrder | null>;
  lockProducts(productIds: string[]): Promise<LockedProduct[]>;
  decrementStock(productId: string, quantity: number): Promise<boolean>;
  restoreStock(productId: string, quantity: number): Promise<boolean>;
  updateOrder(
    orderId: string,
    patch: OrderEditPatch,
  ): Promise<StoredOrder | null>;
}

export interface OrderEditPersistence {
  transaction<T>(
    orderId: string,
    operation: (repository: OrderEditTransactionRepository) => Promise<T>,
  ): Promise<T>;
}

function fingerprintRequest(input: CreateOrderInput): string {
  const canonicalInput = {
    ...input,
    items: [...input.items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    ),
  };

  return createHash("sha256")
    .update(JSON.stringify(canonicalInput))
    .digest("hex");
}

function toResult(order: StoredOrder): OrderResult {
  return orderResultSchema.parse({
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    pickupDiscountPercent: order.pickupDiscountPercent,
    currency: order.currency,
    lines: order.lines.map(
      ({ stockRecordId: _stockRecordId, ...line }) => line,
    ),
    totalRubles: order.totalRubles,
    discountedTotalRubles: order.discountedTotalRubles,
  });
}

function validateCheckoutSettings(settings: OrderCheckoutSettings): Required<
  Omit<OrderCheckoutSettings, "pickupDiscountPercent">
> & {
  pickupDiscountPercent: number;
} {
  const pickupAddress = settings.pickupAddress.trim();
  if (!pickupAddress) {
    throw new OrderServiceError(
      "ORDER_CONFIGURATION_UNAVAILABLE",
      "Pickup address is not configured",
    );
  }
  const pickupDiscountPercent = settings.pickupDiscountPercent ?? 0;
  if (
    !Number.isInteger(pickupDiscountPercent) ||
    pickupDiscountPercent < 0 ||
    pickupDiscountPercent > 100
  ) {
    throw new OrderServiceError(
      "ORDER_CONFIGURATION_UNAVAILABLE",
      "Pickup discount is not configured",
    );
  }
  return {
    pickupAddress,
    pickupDiscountPercent,
  };
}

export async function createOrderWithMeta(
  rawInput: unknown,
  persistence: OrderPersistence,
  rawSettings: OrderCheckoutSettings,
): Promise<OrderCreation> {
  const parsedInput = createOrderInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new OrderServiceError("INVALID_INPUT", "Invalid order payload");
  }

  const input = parsedInput.data;
  const settings = validateCheckoutSettings(rawSettings);
  const requestFingerprint = fingerprintRequest(input);

  return persistence.transaction(input.idempotencyKey, async (repository) => {
    const existing = await repository.findOrderByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new OrderServiceError(
          "IDEMPOTENCY_CONFLICT",
          "Idempotency key is already used for another payload",
        );
      }
      return { created: false, order: existing, result: toResult(existing) };
    }

    const products = await repository.lockProducts(
      input.items.map(({ productId }) => productId),
    );
    const productsById = new Map(
      products.map((product) => [product.productId, product]),
    );

    const lines = input.items.map((item): StoredOrderLine => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new OrderServiceError(
          "PRODUCT_NOT_FOUND",
          `Product ${item.productId} was not found`,
        );
      }
      if (!product.published) {
        throw new OrderServiceError(
          "PRODUCT_UNAVAILABLE",
          `Product ${item.productId} is unavailable`,
        );
      }
      if (
        product.currency !== "RUB" ||
        !Number.isSafeInteger(product.priceRubles) ||
        product.priceRubles <= 0
      ) {
        throw new OrderServiceError(
          "PRODUCT_UNAVAILABLE",
          `Product ${item.productId} has invalid commercial data`,
        );
      }
      if (!isOrderQuantityAvailable(item.quantity, product.stock)) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${item.productId}`,
        );
      }

      return {
        productId: product.productId,
        slug: product.slug,
        title: product.title,
        packageLabel: product.packageLabel,
        unitPriceRubles: product.priceRubles,
        quantity: item.quantity,
        lineTotalRubles: product.priceRubles * item.quantity,
        currency: "RUB",
        stockRecordId: product.recordId,
      };
    });

    for (const [index, line] of lines.entries()) {
      const product = productsById.get(line.productId);
      if (
        !product ||
        !(await repository.decrementStock(
          product.productId,
          input.items[index]!.quantity,
        ))
      ) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${line.productId}`,
        );
      }
    }

    const totalRubles = lines.reduce(
      (total, line) => total + line.lineTotalRubles,
      0,
    );
    const pickupDiscountPercent =
      input.deliveryMethod === "pickup" ? settings.pickupDiscountPercent : 0;
    const discountedTotalRubles = calculateDiscountedTotalRubles(
      totalRubles,
      pickupDiscountPercent,
    );
    const stored = await repository.insertOrder({
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      status: "new",
      customer: input.customer,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress:
        input.deliveryMethod === "pickup"
          ? settings.pickupAddress
          : input.deliveryAddress!,
      pickupDiscountPercent,
      ...(input.comment === undefined ? {} : { comment: input.comment }),
      consents: input.consents,
      lines,
      currency: "RUB",
      totalRubles,
      discountedTotalRubles,
      statusHistory: [
        {
          from: null,
          to: "new",
          at: new Date().toISOString(),
        },
      ],
    });

    return { created: true, order: stored, result: toResult(stored) };
  });
}

export async function createOrder(
  rawInput: unknown,
  persistence: OrderPersistence,
  settings: OrderCheckoutSettings,
): Promise<OrderResult> {
  return (await createOrderWithMeta(rawInput, persistence, settings)).result;
}

export async function editOrder(
  orderId: string,
  rawInput: unknown,
  persistence: OrderEditPersistence,
): Promise<StoredOrder> {
  const parsedInput = editOrderInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new OrderServiceError("INVALID_INPUT", "Invalid order edit payload");
  }

  const input = parsedInput.data;
  return persistence.transaction(orderId, async (repository) => {
    const order = await repository.lockOrder(orderId);
    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "Order was not found");
    }
    if (order.status === "completed" || order.status === "cancelled") {
      throw new OrderServiceError(
        "ORDER_NOT_EDITABLE",
        `Order ${orderId} is not editable in status ${order.status}`,
      );
    }
    if (
      !order.updatedAt ||
      new Date(order.updatedAt).getTime() !==
        new Date(input.expectedUpdatedAt).getTime()
    ) {
      throw new OrderServiceError(
        "ORDER_VERSION_CONFLICT",
        `Order ${orderId} was changed by another administrator`,
      );
    }

    const existingLines = new Map(
      order.lines.map((line) => [line.productId, line]),
    );
    const desiredItems = new Map(
      input.items.map((item) => [item.productId, item]),
    );
    const productIdsToLock = input.items.flatMap((item) => {
      const existing = existingLines.get(item.productId);
      return !existing || item.quantity > existing.quantity
        ? [item.productId]
        : [];
    });
    const products =
      productIdsToLock.length > 0
        ? await repository.lockProducts(productIdsToLock)
        : [];
    const productsById = new Map(
      products.map((product) => [product.productId, product]),
    );

    const lines = input.items.map((item): StoredOrderLine => {
      const existing = existingLines.get(item.productId);
      if (existing) {
        if (item.quantity > existing.quantity) {
          const product = productsById.get(item.productId);
          if (!product || !product.published) {
            throw new OrderServiceError(
              "PRODUCT_UNAVAILABLE",
              `Product ${item.productId} is unavailable`,
            );
          }
          if (product.stock < item.quantity - existing.quantity) {
            throw new OrderServiceError(
              "INSUFFICIENT_STOCK",
              `Insufficient stock for product ${item.productId}`,
            );
          }
        }

        return {
          ...existing,
          quantity: item.quantity,
          lineTotalRubles: existing.unitPriceRubles * item.quantity,
        };
      }

      const product = productsById.get(item.productId);
      if (!product) {
        throw new OrderServiceError(
          "PRODUCT_NOT_FOUND",
          `Product ${item.productId} was not found`,
        );
      }
      if (
        !product.published ||
        product.currency !== "RUB" ||
        !Number.isSafeInteger(product.priceRubles) ||
        product.priceRubles <= 0
      ) {
        throw new OrderServiceError(
          "PRODUCT_UNAVAILABLE",
          `Product ${item.productId} is unavailable`,
        );
      }
      if (!isOrderQuantityAvailable(item.quantity, product.stock)) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${item.productId}`,
        );
      }

      return {
        productId: product.productId,
        slug: product.slug,
        title: product.title,
        packageLabel: product.packageLabel,
        unitPriceRubles: product.priceRubles,
        quantity: item.quantity,
        lineTotalRubles: product.priceRubles * item.quantity,
        currency: "RUB",
        stockRecordId: product.recordId,
      };
    });

    for (const existing of order.lines) {
      const desiredQuantity =
        desiredItems.get(existing.productId)?.quantity ?? 0;
      const quantityToRestore = existing.quantity - desiredQuantity;
      if (
        quantityToRestore > 0 &&
        !(await repository.restoreStock(existing.productId, quantityToRestore))
      ) {
        throw new OrderServiceError(
          "STOCK_RESTORE_FAILED",
          `Could not restore stock for product ${existing.productId}`,
        );
      }
    }

    for (const line of lines) {
      const existingQuantity = existingLines.get(line.productId)?.quantity ?? 0;
      const quantityToReserve = line.quantity - existingQuantity;
      if (
        quantityToReserve > 0 &&
        !(await repository.decrementStock(line.productId, quantityToReserve))
      ) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `Insufficient stock for product ${line.productId}`,
        );
      }
    }

    const totalRubles = lines.reduce(
      (total, line) => total + line.lineTotalRubles,
      0,
    );
    const updated = await repository.updateOrder(orderId, {
      deliveryAddress: input.deliveryAddress,
      managerComment: input.managerComment || null,
      lines,
      totalRubles,
      discountedTotalRubles: calculateDiscountedTotalRubles(
        totalRubles,
        order.pickupDiscountPercent,
      ),
    });
    if (!updated) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "Order was not found");
    }
    return updated;
  });
}

export async function transitionOrderStatus(
  orderId: string,
  rawNextStatus: unknown,
  persistence: OrderStatusPersistence,
  actor?: OrderStatusHistoryEntry["actor"],
): Promise<{ orderId: string; status: OrderStatus }> {
  const nextStatus = orderStatusSchema.safeParse(rawNextStatus);
  if (!nextStatus.success) {
    throw new OrderServiceError("INVALID_STATUS", "Invalid order status");
  }

  return persistence.transaction(orderId, async (repository) => {
    const order = await repository.lockOrder(orderId);
    if (!order) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "Order was not found");
    }
    if (!canTransitionOrderStatus(order.status, nextStatus.data)) {
      throw new OrderServiceError(
        "INVALID_STATUS_TRANSITION",
        `Cannot transition order from ${order.status} to ${nextStatus.data}`,
      );
    }

    if (nextStatus.data === "confirmed") {
      const existingProductIds = new Set(
        await repository.lockExistingProductIds(
          order.lines.map((line) => line.productId),
        ),
      );
      const missingLine = order.lines.find(
        (line) => !existingProductIds.has(line.productId),
      );
      if (missingLine) {
        throw new OrderServiceError(
          "PRODUCT_NOT_FOUND",
          `Product ${missingLine.productId} was deleted before confirmation`,
          { productId: missingLine.productId },
        );
      }
    }

    if (nextStatus.data === "cancelled") {
      for (const line of order.lines) {
        // A deleted catalog document must not make an operational order
        // impossible to cancel. Database failures still throw and roll back.
        await repository.restoreStock(line.productId, line.quantity);
      }
    }

    const statusHistory = [
      ...order.statusHistory,
      {
        from: order.status,
        to: nextStatus.data,
        at: new Date().toISOString(),
        ...(actor === undefined ? {} : { actor }),
      },
    ];
    const updated = await repository.updateStatus(
      orderId,
      nextStatus.data,
      statusHistory,
    );
    if (!updated) {
      throw new OrderServiceError("ORDER_NOT_FOUND", "Order was not found");
    }

    return { orderId: updated.orderId, status: updated.status };
  });
}
