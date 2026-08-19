import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import bootstrap from "../src/plugins/order-admin/server/src/bootstrap.js";
import controllerModule from "../src/plugins/order-admin/server/src/controller.js";
import routes from "../src/plugins/order-admin/server/src/routes.js";
import serviceModule from "../src/plugins/order-admin/server/src/service.js";

const rawOrder = {
  documentId: "order-1",
  orderNumber: "BC-1",
  orderStatus: "new",
  customerName: "Анна",
  customerPhone: "+79991234567",
  customerEmail: null,
  deliveryMethod: "courier",
  deliveryAddress: "Москва",
  pickupDiscountPercent: 0,
  comment: null,
  managerComment: null,
  consents: {
    personalData: { accepted: true, documentVersion: "1" },
    salesAndDelivery: { accepted: true, documentVersion: "1" },
  },
  lines: [
    {
      productId: "product-1",
      stockRecordId: 1,
      slug: "tea-a1b2c3",
      title: "Чай",
      packageLabel: "50 г",
      unitPriceRubles: 1000,
      quantity: 1,
      lineTotalRubles: 1000,
      currency: "RUB",
    },
  ],
  currency: "RUB",
  totalRubles: 1000,
  discountedTotalRubles: 1000,
  statusHistory: [{ from: null, to: "new", at: "2026-07-30T12:00:00.000Z" }],
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

test("local plugin exposes the manifest required by the Strapi loader", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../src/plugins/order-admin/package.json", import.meta.url),
      "utf8",
    ),
  );

  assert.deepEqual(manifest.strapi, {
    kind: "plugin",
    name: "order-admin",
    displayName: "Заказы",
    description: "Рабочее пространство для обработки заказов",
  });
  assert.equal(manifest.exports["./strapi-admin"].import, "./strapi-admin.ts");
  const adminEntry = await readFile(
    new URL("../src/plugins/order-admin/strapi-admin.ts", import.meta.url),
    "utf8",
  );
  assert.match(adminEntry, /import \{ Archive \} from "@strapi\/icons"/);
  assert.doesNotMatch(adminEntry, /ShoppingCart/);
});

test("admin routes require exact read and transition scopes", () => {
  assert.equal(routes.admin.type, "admin");
  assert.deepEqual(
    routes.admin.routes.map((route: any) => ({
      method: route.method,
      path: route.path,
      scope: route.config.auth.scope,
    })),
    [
      {
        method: "GET",
        path: "/orders",
        scope: ["plugin::order-admin.read"],
      },
      {
        method: "GET",
        path: "/products",
        scope: ["plugin::order-admin.edit"],
      },
      {
        method: "GET",
        path: "/orders/:documentId",
        scope: ["plugin::order-admin.read"],
      },
      {
        method: "PUT",
        path: "/orders/:documentId",
        scope: ["plugin::order-admin.edit"],
      },
      {
        method: "POST",
        path: "/orders/:documentId/status",
        scope: ["plugin::order-admin.transition"],
      },
      {
        method: "DELETE",
        path: "/orders/:documentId",
        scope: ["plugin::order-admin.delete"],
      },
    ],
  );
});

test("bootstrap registers independent read and transition permissions", async () => {
  const registrations: unknown[] = [];
  await bootstrap({
    strapi: {
      admin: {
        services: {
          permission: {
            actionProvider: {
              registerMany: async (actions: unknown[]) =>
                registrations.push(...actions),
            },
          },
        },
      },
    },
  });

  assert.deepEqual(
    registrations.map((registration: any) => registration.uid),
    ["read", "transition", "edit", "delete"],
  );
});

test("service builds server filters, pagination and sanitized DTOs", async () => {
  const calls: Array<[string, unknown]> = [];
  const repository = {
    findMany: async (query: unknown) => {
      calls.push(["findMany", query]);
      return [rawOrder];
    },
    count: async (query: unknown) => {
      calls.push(["count", query]);
      return 26;
    },
    findOne: async () => rawOrder,
  };
  const service = serviceModule.createOrderAdminService({
    strapi: {
      db: { query: () => repository },
      service: () => ({
        transitionStatus: async () => undefined,
        editFromAdmin: async () => undefined,
      }),
    },
  });

  const result = await service.list({
    page: 2,
    pageSize: 25,
    search: "BC",
    status: "new",
    createdFrom: "2026-07-01T00:00:00.000Z",
  });

  assert.deepEqual(result.meta, {
    page: 2,
    pageSize: 25,
    pageCount: 2,
    total: 26,
  });
  assert.equal(result.data[0]?.orderNumber, "BC-1");
  assert.equal(JSON.stringify(result.data).includes("+7999"), false);
  assert.deepEqual((calls[0]?.[1] as any).where, {
    $or: [
      { orderNumber: { $containsi: "BC" } },
      { customerName: { $containsi: "BC" } },
    ],
    orderStatus: "new",
    createdAt: { $gte: "2026-07-01T00:00:00.000Z" },
  });
  assert.equal((calls[0]?.[1] as any).offset, 25);
});

test("product options expose technical labels and safe commercial data", async () => {
  const queries: unknown[] = [];
  const orderRepository = { findOne: async () => rawOrder };
  const productRepository = {
    findMany: async (query: unknown) => {
      queries.push(query);
      return [
        {
          documentId: "product-1",
          title: "Сорт: Да Хун Пао",
          displayName: "Да Хун Пао",
          packageLabel: "50 г",
          price: 1600,
          stock: 3,
          publishedAt: "2026-08-03T10:00:00.000Z",
        },
      ];
    },
  };
  const service = serviceModule.createOrderAdminService({
    strapi: {
      db: {
        query: (uid: string) =>
          uid === "api::product.product" ? productRepository : orderRepository,
      },
      service: () => ({ editFromAdmin: async () => undefined }),
    },
  });

  const result = await service.products({ search: "Да Хун" });

  assert.deepEqual(result.data, [
    {
      productId: "product-1",
      technicalName: "Сорт: Да Хун Пао",
      displayName: "Да Хун Пао",
      packageLabel: "50 г",
      priceRubles: 1600,
      stock: 3,
    },
  ]);
  assert.deepEqual((queries[0] as any).where, {
    publishedAt: { $notNull: true },
    $or: [
      { title: { $containsi: "Да Хун" } },
      { displayName: { $containsi: "Да Хун" } },
    ],
  });
});

test("edit service delegates to the transactional order domain", async () => {
  const edits: unknown[][] = [];
  const service = serviceModule.createOrderAdminService({
    strapi: {
      db: {
        query: () => ({
          findOne: async () => ({
            ...rawOrder,
            managerComment: "Позвонить вечером",
            updatedAt: "2026-08-03T10:01:00.000Z",
          }),
        }),
      },
      service: () => ({
        editFromAdmin: async (...args: unknown[]) => edits.push(args),
      }),
    },
  });
  const command = {
    expectedUpdatedAt: rawOrder.updatedAt,
    deliveryAddress: "Новый адрес",
    managerComment: "Позвонить вечером",
    items: [{ productId: "product-1", quantity: 1 }],
  };

  const result = await service.edit("order-1", command);

  assert.deepEqual(edits, [["order-1", command]]);
  assert.equal(result?.managerComment, "Позвонить вечером");
  assert.equal(result?.editable, true);
});

test("status service delegates to domain transition before re-reading detail", async () => {
  const transitions: unknown[][] = [];
  const actor = { id: "7", name: "Анна Менеджер" };
  const service = serviceModule.createOrderAdminService({
    strapi: {
      db: {
        query: () => ({
          findOne: async () => ({
            ...rawOrder,
            orderStatus: "confirmed",
            statusHistory: [
              ...rawOrder.statusHistory,
              {
                from: "new",
                to: "confirmed",
                at: "2026-07-30T12:10:00.000Z",
              },
            ],
          }),
        }),
      },
      service: () => ({
        transitionStatus: async (...args: unknown[]) => transitions.push(args),
      }),
    },
  });

  const result = await service.transition("order-1", "confirmed", actor);
  assert.deepEqual(transitions, [["order-1", "confirmed", actor]]);
  assert.equal(result?.status, "confirmed");
  assert.deepEqual(result?.availableStatusTransitions, [
    "completed",
    "cancelled",
  ]);
});

test("delete service delegates to the transactional order deletion", async () => {
  const deletions: unknown[][] = [];
  const service = serviceModule.createOrderAdminService({
    strapi: {
      db: { query: () => ({ findOne: async () => rawOrder }) },
      service: () => ({
        deleteFromAdmin: async (...args: unknown[]) => {
          deletions.push(args);
          return { orderId: "order-1", stockChanged: true };
        },
      }),
    },
  });

  const result = await service.delete("order-1");

  assert.deepEqual(deletions, [["order-1"]]);
  assert.deepEqual(result, { documentId: "order-1" });
});

test("controller rejects invalid input and maps missing orders", async () => {
  const controller = controllerModule.createOrderAdminController({
    strapi: {
      plugin: () => ({
        service: () => ({
          list: async () => ({ data: [], meta: {} }),
          findOne: async () => null,
          products: async () => ({ data: [] }),
          edit: async () => null,
          transition: async () => null,
        }),
      }),
    },
  });
  const badRequests: string[] = [];
  const notFound: string[] = [];
  const context: any = {
    query: { pageSize: "1000" },
    params: { documentId: "missing" },
    request: { body: { status: "paid" } },
    badRequest: (message: string) => badRequests.push(message),
    notFound: (message: string) => notFound.push(message),
  };

  await controller.list(context);
  await controller.findOne(context);
  await controller.transition(context);

  assert.deepEqual(badRequests, ["Некорректный запрос", "Некорректный статус"]);
  assert.deepEqual(notFound, ["Заказ не найден"]);
});

test("successful transition logs only operational identifiers", async () => {
  const logs: unknown[] = [];
  const transitions: unknown[][] = [];
  const controller = controllerModule.createOrderAdminController({
    strapi: {
      log: { info: (...args: unknown[]) => logs.push(args) },
      plugin: () => ({
        service: () => ({
          findOne: async () => ({ status: "new" }),
          transition: async (...args: unknown[]) => {
            transitions.push(args);
            return { status: "confirmed" };
          },
        }),
      }),
    },
  });
  const context: any = {
    params: { documentId: "ahwc7pxi66m4j4xtya2vto7q" },
    request: { body: { status: "confirmed" } },
    state: { user: { id: 42, email: "must-not-be-logged@example.test" } },
  };

  await controller.transition(context);

  assert.equal(context.body.data.status, "confirmed");
  assert.deepEqual(transitions, [
    [
      "ahwc7pxi66m4j4xtya2vto7q",
      "confirmed",
      { id: "42", name: "Администратор 42" },
    ],
  ]);
  assert.deepEqual(logs, [
    [
      "Order admin status transition",
      {
        documentId: "ahwc7pxi66m4j4xtya2vto7q",
        from: "new",
        to: "confirmed",
        administratorId: "42",
        result: "success",
      },
    ],
  ]);
  assert.equal(JSON.stringify(logs).includes("must-not-be-logged"), false);
});

test("edit controller maps version conflicts without logging customer data", async () => {
  const logs: unknown[] = [];
  const controller = controllerModule.createOrderAdminController({
    strapi: {
      log: { warn: (...args: unknown[]) => logs.push(args) },
      plugin: () => ({
        service: () => ({
          edit: async () => {
            throw { code: "ORDER_VERSION_CONFLICT" };
          },
        }),
      }),
    },
  });
  const conflicts: string[] = [];
  const context: any = {
    params: { documentId: "order-1" },
    request: {
      body: {
        expectedUpdatedAt: "2026-08-03T10:00:00.000Z",
        deliveryAddress: "Москва",
        managerComment: "Секрет клиента",
        items: [{ productId: "product-1", quantity: 1 }],
      },
    },
    state: { user: { id: 42, email: "private@example.test" } },
    conflict: (message: string) => conflicts.push(message),
  };

  await controller.edit(context);

  assert.deepEqual(conflicts, [
    "Заказ уже изменён другим менеджером. Обновите страницу",
  ]);
  assert.equal(JSON.stringify(logs).includes("Секрет клиента"), false);
  assert.equal(JSON.stringify(logs).includes("private@example.test"), false);
});

test("status controller explains a deleted product without exposing internals", async () => {
  const warnings: unknown[] = [];
  const controller = controllerModule.createOrderAdminController({
    strapi: {
      log: { warn: (...args: unknown[]) => warnings.push(args) },
      plugin: () => ({
        service: () => ({
          findOne: async () => ({
            documentId: "order-1",
            status: "new",
            lines: [
              {
                productId: "product-1",
                title: "Долгий вечер",
              },
            ],
          }),
          transition: async () => {
            throw {
              code: "PRODUCT_NOT_FOUND",
              details: { productId: "product-1" },
            };
          },
        }),
      }),
    },
  });
  const conflicts: string[] = [];
  const context: any = {
    params: { documentId: "order-1" },
    request: { body: { status: "confirmed" } },
    state: { user: { id: 42 } },
    conflict: (message: string) => conflicts.push(message),
  };

  await controller.transition(context);

  assert.deepEqual(conflicts, [
    "Нельзя подтвердить заказ: товар «Долгий вечер» удалён",
  ]);
  assert.equal(JSON.stringify(warnings).includes("product-1"), false);
});
