import { factories } from "@strapi/strapi";

import {
  createOrderWithMeta,
  editOrder,
  transitionOrderStatus,
  type OrderEditPersistence,
  type OrderEditPatch,
  type OrderEditTransactionRepository,
  type LockedProduct,
  type OrderDraft,
  type OrderCheckoutSettings,
  type OrderPersistence,
  type OrderStatusPersistence,
  type OrderStatusTransactionRepository,
  type StoredOrder,
  type TransactionRepository,
} from "./order-domain";
import {
  createOrderNumber,
  getNextOrderNumberSequence,
  getOrderNumberPrefix,
} from "./order-number";
import { notifyOrderCreation } from "./order-notification";
import { runStockMutationWithRevalidation } from "./order-stock-revalidation";
import { createCacheRevalidationSenderFromEnv } from "../../../cache-revalidation/index.js";

const ORDER_UID = "api::order.order" as const;
const PRODUCT_TABLE = "products";

type DatabaseTransaction = {
  trx: {
    raw(query: string, bindings?: unknown[]): Promise<unknown>;
  };
};

type StoredOrderRow = {
  id: number;
  documentId?: string;
  orderNumber: string;
  idempotencyKey: string;
  requestFingerprint: string;
  orderStatus: StoredOrder["status"];
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryMethod: StoredOrder["deliveryMethod"];
  deliveryAddress: string;
  pickupDiscountPercent: number;
  comment?: string | null;
  managerComment?: string | null;
  consents: OrderDraft["consents"];
  lines: OrderDraft["lines"];
  currency: "RUB";
  totalRubles: number;
  discountedTotalRubles: number;
  statusHistory: OrderDraft["statusHistory"];
  updatedAt: string | Date;
};

type ProductStockRow = Record<string, unknown> & {
  id: number;
  document_id: string;
  stock: number;
  published_at?: string | Date | null;
};

const toIsoTimestamp = (value: string | Date) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapStoredOrder = (row: StoredOrderRow): StoredOrder => ({
  orderId: row.documentId ?? String(row.id),
  orderNumber: row.orderNumber,
  idempotencyKey: row.idempotencyKey,
  requestFingerprint: row.requestFingerprint,
  status: row.orderStatus,
  customer: {
    name: row.customerName,
    phone: row.customerPhone,
    ...(row.customerEmail ? { email: row.customerEmail } : {}),
  },
  deliveryMethod: row.deliveryMethod,
  deliveryAddress: row.deliveryAddress,
  pickupDiscountPercent: row.pickupDiscountPercent,
  ...(row.comment ? { comment: row.comment } : {}),
  managerComment: row.managerComment ?? null,
  consents: row.consents,
  lines: row.lines,
  currency: row.currency,
  totalRubles: row.totalRubles,
  discountedTotalRubles: row.discountedTotalRubles,
  statusHistory: row.statusHistory,
  updatedAt: toIsoTimestamp(row.updatedAt),
});

async function lockProductRows(
  strapi: any,
  trx: DatabaseTransaction["trx"],
  productIds: string[],
): Promise<ProductStockRow[]> {
  const stableProductIds = [...new Set(productIds)].sort();
  if (stableProductIds.length === 0) return [];

  return strapi.db
    .connection(PRODUCT_TABLE)
    .select([
      "id",
      "document_id",
      "slug",
      "display_name",
      "package_label",
      "price",
      "currency",
      "stock",
      "published_at",
    ])
    .whereIn("document_id", stableProductIds)
    .orderBy("document_id", "asc")
    .orderBy("id", "asc")
    .forUpdate()
    .transacting(trx);
}

function findPublishedProduct(rows: ProductStockRow[]) {
  return rows.find((row) => row.published_at != null);
}

async function setProductStock(
  strapi: any,
  trx: DatabaseTransaction["trx"],
  productId: string,
  stock: number,
) {
  const updated = await strapi.db
    .connection(PRODUCT_TABLE)
    .where({ document_id: productId })
    .update({ stock })
    .transacting(trx);
  return Number(updated) > 0;
}

async function decrementProductStock(
  strapi: any,
  trx: DatabaseTransaction["trx"],
  productId: string,
  quantity: number,
) {
  const rows = await lockProductRows(strapi, trx, [productId]);
  const published = findPublishedProduct(rows);
  if (!published || Number(published.stock) < quantity) return false;

  return setProductStock(
    strapi,
    trx,
    productId,
    Number(published.stock) - quantity,
  );
}

async function restoreProductStock(
  strapi: any,
  trx: DatabaseTransaction["trx"],
  productId: string,
  quantity: number,
) {
  const rows = await lockProductRows(strapi, trx, [productId]);
  const current = findPublishedProduct(rows) ?? rows[0];
  if (!current) return false;

  return setProductStock(
    strapi,
    trx,
    productId,
    Number(current.stock) + quantity,
  );
}

function createPersistence(strapi: any): OrderPersistence {
  return {
    async transaction<T>(
      idempotencyKey: string,
      operation: (repository: TransactionRepository) => Promise<T>,
    ) {
      return strapi.db.transaction(
        async ({ trx }: DatabaseTransaction): Promise<T> => {
          await trx.raw("select pg_advisory_xact_lock(hashtext(?))", [
            idempotencyKey,
          ]);

          const repository: TransactionRepository = {
            async findOrderByIdempotencyKey(key) {
              const row = await strapi.db.query(ORDER_UID).findOne({
                where: { idempotencyKey: key },
                transacting: trx,
              });
              return row ? mapStoredOrder(row as StoredOrderRow) : null;
            },

            async lockProducts(productIds) {
              const rows = (
                await lockProductRows(strapi, trx, productIds)
              ).filter((row) => row.published_at != null);

              return rows.map(
                (row: Record<string, unknown>): LockedProduct => ({
                  recordId: Number(row.id),
                  productId: String(row.document_id),
                  slug: String(row.slug),
                  title: String(row.display_name),
                  packageLabel: String(row.package_label),
                  priceRubles: Number(row.price),
                  currency: String(row.currency),
                  stock: Number(row.stock),
                  published: row.published_at != null,
                }),
              );
            },

            async decrementStock(productId, quantity) {
              return decrementProductStock(strapi, trx, productId, quantity);
            },

            async insertOrder(draft) {
              const now = new Date();
              const prefix = getOrderNumberPrefix(now);
              await trx.raw("select pg_advisory_xact_lock(hashtext(?))", [
                `order-number:${prefix}`,
              ]);
              const latest = await strapi.db
                .connection("orders")
                .select("order_number")
                .where("order_number", "like", `${prefix}-%`)
                .orderBy("order_number", "desc")
                .first()
                .transacting(trx);
              const sequence = getNextOrderNumberSequence(
                latest?.order_number,
                prefix,
              );
              const row = await strapi.db.query(ORDER_UID).create({
                data: {
                  orderNumber: createOrderNumber(now, sequence),
                  idempotencyKey: draft.idempotencyKey,
                  requestFingerprint: draft.requestFingerprint,
                  orderStatus: "new",
                  customerName: draft.customer.name,
                  customerPhone: draft.customer.phone,
                  customerEmail: draft.customer.email,
                  deliveryMethod: draft.deliveryMethod,
                  deliveryAddress: draft.deliveryAddress,
                  pickupDiscountPercent: draft.pickupDiscountPercent,
                  comment: draft.comment,
                  consents: draft.consents,
                  lines: draft.lines,
                  currency: "RUB",
                  totalRubles: draft.totalRubles,
                  discountedTotalRubles: draft.discountedTotalRubles,
                  statusHistory: draft.statusHistory,
                },
                transacting: trx,
              });
              return mapStoredOrder(row as StoredOrderRow);
            },
          };

          return operation(repository);
        },
      );
    },
  };
}

function createStatusPersistence(strapi: any): OrderStatusPersistence {
  return {
    async transaction<T>(
      orderId: string,
      operation: (repository: OrderStatusTransactionRepository) => Promise<T>,
    ) {
      return strapi.db.transaction(
        async ({ trx }: DatabaseTransaction): Promise<T> => {
          const repository: OrderStatusTransactionRepository = {
            async lockOrder(id) {
              const locked = await strapi.db
                .connection("orders")
                .select("id")
                .where("document_id", id)
                .first()
                .forUpdate()
                .transacting(trx);
              if (!locked) return null;

              const row = await strapi.db.query(ORDER_UID).findOne({
                where: { documentId: id },
                transacting: trx,
              });
              return row ? mapStoredOrder(row as StoredOrderRow) : null;
            },

            async lockExistingProductIds(productIds) {
              const rows = await lockProductRows(strapi, trx, productIds);
              return [...new Set(rows.map((row) => String(row.document_id)))];
            },

            async restoreStock(productId, quantity) {
              return restoreProductStock(strapi, trx, productId, quantity);
            },

            async updateStatus(id, status, statusHistory) {
              const row = await strapi.db.query(ORDER_UID).update({
                where: { documentId: id },
                data: { orderStatus: status, statusHistory },
                transacting: trx,
              });
              return row ? mapStoredOrder(row as StoredOrderRow) : null;
            },
          };

          return operation(repository);
        },
      );
    },
  };
}

function createEditPersistence(strapi: any): OrderEditPersistence {
  return {
    async transaction<T>(
      orderId: string,
      operation: (repository: OrderEditTransactionRepository) => Promise<T>,
    ) {
      return strapi.db.transaction(
        async ({ trx }: DatabaseTransaction): Promise<T> => {
          const repository: OrderEditTransactionRepository = {
            async lockOrder(id) {
              const locked = await strapi.db
                .connection("orders")
                .select("id")
                .where("document_id", id)
                .first()
                .forUpdate()
                .transacting(trx);
              if (!locked) return null;

              const row = await strapi.db.query(ORDER_UID).findOne({
                where: { documentId: id },
                transacting: trx,
              });
              return row ? mapStoredOrder(row as StoredOrderRow) : null;
            },

            async lockProducts(productIds) {
              const rows = (
                await lockProductRows(strapi, trx, productIds)
              ).filter((row) => row.published_at != null);

              return rows.map(
                (row: Record<string, unknown>): LockedProduct => ({
                  recordId: Number(row.id),
                  productId: String(row.document_id),
                  slug: String(row.slug),
                  title: String(row.display_name),
                  packageLabel: String(row.package_label),
                  priceRubles: Number(row.price),
                  currency: String(row.currency),
                  stock: Number(row.stock),
                  published: row.published_at != null,
                }),
              );
            },

            async decrementStock(productId, quantity) {
              return decrementProductStock(strapi, trx, productId, quantity);
            },

            async restoreStock(productId, quantity) {
              return restoreProductStock(strapi, trx, productId, quantity);
            },

            async updateOrder(id, patch: OrderEditPatch) {
              const row = await strapi.db.query(ORDER_UID).update({
                where: { documentId: id },
                data: patch,
                transacting: trx,
              });
              return row ? mapStoredOrder(row as StoredOrderRow) : null;
            },
          };

          return operation(repository);
        },
      );
    },
  };
}

export default factories.createCoreService(ORDER_UID, ({ strapi }) => {
  const stockRevalidationSender = createCacheRevalidationSenderFromEnv(
    {
      CACHE_REVALIDATION_URL: process.env.CACHE_REVALIDATION_URL,
      CACHE_REVALIDATION_SECRET: process.env.CACHE_REVALIDATION_SECRET,
      CACHE_REVALIDATION_TIMEOUT_MS: process.env.CACHE_REVALIDATION_TIMEOUT_MS,
    },
    { logger: strapi.log },
  );

  return {
    async createFromInput(rawInput: unknown) {
      const settings = await strapi
        .documents("api::global-setting.global-setting")
        .findFirst({
          status: "published",
          fields: [
            "orderNotificationEmail",
            "pickupAddress",
            "pickupDiscountPercent",
          ],
        });
      const pickupDiscountPercent = settings?.pickupDiscountPercent;
      const checkoutSettings: OrderCheckoutSettings = {
        pickupAddress: String(settings?.pickupAddress ?? ""),
        pickupDiscountPercent:
          typeof pickupDiscountPercent === "number"
            ? pickupDiscountPercent
            : null,
      };
      const creation = await createOrderWithMeta(
        rawInput,
        createPersistence(strapi),
        checkoutSettings,
      );

      if (creation.created) {
        void notifyOrderCreation({
          creation,
          recipient: String(settings?.orderNotificationEmail ?? ""),
          strapi,
        });
      }

      return creation.result;
    },

    async transitionStatus(
      orderId: string,
      nextStatus: unknown,
      actor?: OrderDraft["statusHistory"][number]["actor"],
    ) {
      const transition = () =>
        transitionOrderStatus(
          orderId,
          nextStatus,
          createStatusPersistence(strapi),
          actor,
        );

      return nextStatus === "cancelled"
        ? runStockMutationWithRevalidation(
            transition,
            stockRevalidationSender,
            strapi.log,
          )
        : transition();
    },

    async editFromAdmin(orderId: string, rawInput: unknown) {
      return runStockMutationWithRevalidation(
        () => editOrder(orderId, rawInput, createEditPersistence(strapi)),
        stockRevalidationSender,
        strapi.log,
      );
    },
  };
});
