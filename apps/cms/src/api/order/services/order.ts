import { factories } from "@strapi/strapi";

import {
  createOrder,
  transitionOrderStatus,
  type LockedProduct,
  type OrderDraft,
  type OrderPersistence,
  type OrderStatusPersistence,
  type OrderStatusTransactionRepository,
  type StoredOrder,
  type TransactionRepository,
} from "./order-domain";

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
  deliveryAddress: string;
  comment?: string | null;
  consents: OrderDraft["consents"];
  lines: OrderDraft["lines"];
  currency: "RUB";
  totalRubles: number;
  statusHistory: OrderDraft["statusHistory"];
};

const createOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `BC-${timestamp}-${suffix}`;
};

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
  deliveryAddress: row.deliveryAddress,
  ...(row.comment ? { comment: row.comment } : {}),
  consents: row.consents,
  lines: row.lines,
  currency: row.currency,
  totalRubles: row.totalRubles,
  statusHistory: row.statusHistory,
});

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
              const rows = await strapi.db
                .connection(PRODUCT_TABLE)
                .select([
                  "id",
                  "document_id",
                  "slug",
                  "title",
                  "package_label",
                  "price",
                  "currency",
                  "stock",
                  "active",
                  "published_at",
                ])
                .whereIn("document_id", productIds)
                .whereNotNull("published_at")
                .forUpdate()
                .transacting(trx);

              return rows.map(
                (row: Record<string, unknown>): LockedProduct => ({
                  recordId: Number(row.id),
                  productId: String(row.document_id),
                  slug: String(row.slug),
                  title: String(row.title),
                  packageLabel: String(row.package_label),
                  priceRubles: Number(row.price),
                  currency: String(row.currency),
                  stock: Number(row.stock),
                  active: row.active === true,
                  published: row.published_at != null,
                }),
              );
            },

            async decrementStock(recordId, quantity) {
              const updated = await strapi.db
                .connection(PRODUCT_TABLE)
                .where({ id: recordId })
                .where("stock", ">=", quantity)
                .decrement("stock", quantity)
                .transacting(trx);
              return Number(updated) > 0;
            },

            async insertOrder(draft) {
              const row = await strapi.db.query(ORDER_UID).create({
                data: {
                  orderNumber: createOrderNumber(),
                  idempotencyKey: draft.idempotencyKey,
                  requestFingerprint: draft.requestFingerprint,
                  orderStatus: "new",
                  customerName: draft.customer.name,
                  customerPhone: draft.customer.phone,
                  customerEmail: draft.customer.email,
                  deliveryAddress: draft.deliveryAddress,
                  comment: draft.comment,
                  consents: draft.consents,
                  lines: draft.lines,
                  currency: "RUB",
                  totalRubles: draft.totalRubles,
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

            async restoreStock(recordId, quantity) {
              const updated = await strapi.db
                .connection(PRODUCT_TABLE)
                .where({ id: recordId })
                .increment("stock", quantity)
                .transacting(trx);
              return Number(updated) > 0;
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

export default factories.createCoreService(ORDER_UID, ({ strapi }) => ({
  async createFromInput(rawInput: unknown) {
    return createOrder(rawInput, createPersistence(strapi));
  },

  async transitionStatus(orderId: string, nextStatus: unknown) {
    return transitionOrderStatus(
      orderId,
      nextStatus,
      createStatusPersistence(strapi),
    );
  },
}));
