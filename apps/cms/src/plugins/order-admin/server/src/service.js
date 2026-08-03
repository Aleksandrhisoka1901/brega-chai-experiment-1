"use strict";

const {
  mapOrderDetail,
  mapOrderListItem,
  mapProductOption,
} = require("./domain");

const ORDER_UID = "api::order.order";
const PRODUCT_UID = "api::product.product";

function buildWhere(query) {
  const where = {};

  if (query.search) {
    where.$or = [
      { orderNumber: { $containsi: query.search } },
      { customerName: { $containsi: query.search } },
    ];
  }
  if (query.status) where.orderStatus = query.status;
  if (query.createdFrom || query.createdTo) {
    where.createdAt = {
      ...(query.createdFrom ? { $gte: query.createdFrom } : {}),
      ...(query.createdTo ? { $lte: query.createdTo } : {}),
    };
  }

  return where;
}

function createOrderAdminService({ strapi }) {
  const repository = strapi.db.query(ORDER_UID);
  const productRepository = strapi.db.query(PRODUCT_UID);

  async function findRawOrder(documentId) {
    return repository.findOne({ where: { documentId } });
  }

  return {
    async list(query) {
      const where = buildWhere(query);
      const [rows, total] = await Promise.all([
        repository.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          offset: (query.page - 1) * query.pageSize,
          limit: query.pageSize,
        }),
        repository.count({ where }),
      ]);

      return {
        data: rows.map(mapOrderListItem),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          pageCount: Math.ceil(total / query.pageSize),
          total,
        },
      };
    },

    async findOne(documentId) {
      const order = await findRawOrder(documentId);
      return order ? mapOrderDetail(order) : null;
    },

    async products(query) {
      const where = {
        publishedAt: { $notNull: true },
        ...(query.search
          ? {
              $or: [
                { title: { $containsi: query.search } },
                { displayName: { $containsi: query.search } },
              ],
            }
          : {}),
      };
      const rows = await productRepository.findMany({
        where,
        orderBy: [{ title: "asc" }, { id: "asc" }],
        limit: 100,
      });
      return { data: rows.map(mapProductOption) };
    },

    async edit(documentId, command) {
      await strapi.service(ORDER_UID).editFromAdmin(documentId, command);
      const order = await findRawOrder(documentId);
      return order ? mapOrderDetail(order) : null;
    },

    async transition(documentId, status, actor) {
      await strapi
        .service(ORDER_UID)
        .transitionStatus(documentId, status, actor);
      const order = await findRawOrder(documentId);
      return order ? mapOrderDetail(order) : null;
    },
  };
}

module.exports = { buildWhere, createOrderAdminService };
