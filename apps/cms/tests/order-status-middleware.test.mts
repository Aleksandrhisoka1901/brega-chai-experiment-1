import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createOrderStatusMiddleware,
  registerOrderStatusMiddleware,
} from "../src/api/order/order-status-middleware.ts";

const orderUpdate = (status: unknown = "confirmed") => ({
  uid: "api::order.order",
  action: "update",
  params: {
    documentId: "order-1",
    data: {
      customerName: "Анна",
      orderStatus: status,
    },
  },
});

const deletionDependency = async () => undefined;

test("routes an admin status change through the transactional service", async () => {
  const context = orderUpdate();
  const transitions: Array<[string, unknown]> = [];
  let nextCalls = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: deletionDependency,
    findStatus: async () => "new",
    transitionStatus: async (orderId, status) => {
      transitions.push([orderId, status]);
    },
  });

  await middleware(context, async () => {
    nextCalls += 1;
    assert.deepEqual(context.params.data, { customerName: "Анна" });
  });

  assert.deepEqual(transitions, [["order-1", "confirmed"]]);
  assert.equal(nextCalls, 1);
});

test("does not transition when Content Manager resubmits the current status", async () => {
  const context = orderUpdate("new");
  let transitions = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: deletionDependency,
    findStatus: async () => "new",
    transitionStatus: async () => {
      transitions += 1;
    },
  });

  await middleware(context, async () => {
    assert.equal("orderStatus" in context.params.data, false);
  });

  assert.equal(transitions, 0);
});

test("does not call the direct update after a rejected transition", async () => {
  const context = orderUpdate("completed");
  const expected = new Error("invalid transition");
  let nextCalls = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: deletionDependency,
    findStatus: async () => "new",
    transitionStatus: async () => {
      throw expected;
    },
  });

  await assert.rejects(
    middleware(context, async () => {
      nextCalls += 1;
    }),
    expected,
  );
  assert.equal(nextCalls, 0);
});

test("rejects a status update without a stable order document id", async () => {
  const context = {
    ...orderUpdate(),
    params: {
      data: orderUpdate().params.data,
    },
  };
  let nextCalls = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: deletionDependency,
    findStatus: async () => "new",
    transitionStatus: async () => undefined,
  });

  await assert.rejects(
    middleware(context, async () => {
      nextCalls += 1;
    }),
    /document id/i,
  );
  assert.equal(nextCalls, 0);
});

test("ignores other document actions and content types", async () => {
  let dependencyCalls = 0;
  let nextCalls = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: deletionDependency,
    findStatus: async () => {
      dependencyCalls += 1;
      return "new";
    },
    transitionStatus: async () => {
      dependencyCalls += 1;
    },
  });

  for (const context of [
    {
      ...orderUpdate(),
      action: "findOne",
    },
    {
      ...orderUpdate(),
      uid: "api::product.product",
    },
    {
      ...orderUpdate(),
      params: { documentId: "order-1", data: { customerName: "Анна" } },
    },
  ]) {
    await middleware(context, async () => {
      nextCalls += 1;
    });
  }

  assert.equal(dependencyCalls, 0);
  assert.equal(nextCalls, 3);
});

test("routes Content Manager deletion through the transactional service", async () => {
  const deletions: string[] = [];
  let nextCalls = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: async (orderId) => {
      deletions.push(orderId);
    },
    findStatus: async () => "new",
    transitionStatus: async () => undefined,
  });

  await middleware(
    {
      uid: "api::order.order",
      action: "delete",
      params: { documentId: "order-1" },
    },
    async () => {
      nextCalls += 1;
    },
  );

  assert.deepEqual(deletions, ["order-1"]);
  assert.equal(nextCalls, 0);
});

test("rejects Content Manager deletion without a stable order id", async () => {
  let deletions = 0;
  const middleware = createOrderStatusMiddleware({
    deleteOrder: async () => {
      deletions += 1;
    },
    findStatus: async () => "new",
    transitionStatus: async () => undefined,
  });

  await assert.rejects(
    middleware(
      { uid: "api::order.order", action: "delete", params: {} },
      async () => undefined,
    ),
    /document id/i,
  );
  assert.equal(deletions, 0);
});

test("registers the guard on the Strapi document service boundary", () => {
  let registered: unknown;
  registerOrderStatusMiddleware({
    documents: {
      use(middleware: unknown) {
        registered = middleware;
      },
    },
    service: () => ({
      deleteFromAdmin: deletionDependency,
      transitionStatus: async () => undefined,
    }),
    db: {
      query: () => ({ findOne: async () => ({ orderStatus: "new" }) }),
    },
  });

  assert.equal(typeof registered, "function");
});
