import { createHash } from "node:crypto";

import {
  canTransitionOrderStatus,
  createOrderInputSchema,
  isOrderQuantityAvailable,
  orderResultSchema,
  orderStatusSchema,
  type CreateOrderInput,
  type OrderLineSnapshot,
  type OrderResult,
  type OrderStatus,
} from "@brega-chai/contracts";

export type OrderServiceErrorCode =
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS"
  | "INVALID_STATUS_TRANSITION"
  | "STOCK_RESTORE_FAILED";

export class OrderServiceError extends Error {
  readonly code: OrderServiceErrorCode;

  constructor(code: OrderServiceErrorCode, message: string) {
    super(message);
    this.name = "OrderServiceError";
    this.code = code;
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
  active: boolean;
  published: boolean;
}

export interface OrderDraft {
  idempotencyKey: string;
  requestFingerprint: string;
  status: "new";
  customer: CreateOrderInput["customer"];
  deliveryAddress: string;
  comment?: string;
  consents: CreateOrderInput["consents"];
  lines: StoredOrderLine[];
  currency: "RUB";
  totalRubles: number;
  statusHistory: OrderStatusHistoryEntry[];
}

export interface StoredOrderLine extends OrderLineSnapshot {
  stockRecordId: number;
}

export interface OrderStatusHistoryEntry {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
}

export interface StoredOrder extends Omit<OrderDraft, "status"> {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface TransactionRepository {
  findOrderByIdempotencyKey(key: string): Promise<StoredOrder | null>;
  lockProducts(productIds: string[]): Promise<LockedProduct[]>;
  decrementStock(recordId: number, quantity: number): Promise<boolean>;
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
  restoreStock(recordId: number, quantity: number): Promise<boolean>;
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
    status: order.status,
    currency: order.currency,
    lines: order.lines.map(
      ({ stockRecordId: _stockRecordId, ...line }) => line,
    ),
    totalRubles: order.totalRubles,
  });
}

export async function createOrder(
  rawInput: unknown,
  persistence: OrderPersistence,
): Promise<OrderResult> {
  const parsedInput = createOrderInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new OrderServiceError("INVALID_INPUT", "Invalid order payload");
  }

  const input = parsedInput.data;
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
      return toResult(existing);
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
      if (!product.active || !product.published) {
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
          product.recordId,
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
    const stored = await repository.insertOrder({
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      status: "new",
      customer: input.customer,
      deliveryAddress: input.deliveryAddress,
      ...(input.comment === undefined ? {} : { comment: input.comment }),
      consents: input.consents,
      lines,
      currency: "RUB",
      totalRubles,
      statusHistory: [
        {
          from: null,
          to: "new",
          at: new Date().toISOString(),
        },
      ],
    });

    return toResult(stored);
  });
}

export async function transitionOrderStatus(
  orderId: string,
  rawNextStatus: unknown,
  persistence: OrderStatusPersistence,
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

    if (nextStatus.data === "cancelled") {
      for (const line of order.lines) {
        if (
          !(await repository.restoreStock(line.stockRecordId, line.quantity))
        ) {
          throw new OrderServiceError(
            "STOCK_RESTORE_FAILED",
            `Could not restore stock for product ${line.productId}`,
          );
        }
      }
    }

    const statusHistory = [
      ...order.statusHistory,
      {
        from: order.status,
        to: nextStatus.data,
        at: new Date().toISOString(),
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
