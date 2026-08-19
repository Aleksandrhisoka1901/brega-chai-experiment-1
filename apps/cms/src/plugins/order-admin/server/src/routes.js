"use strict";

module.exports = {
  admin: {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/orders",
        handler: "orders.list",
        config: {
          auth: { scope: ["plugin::order-admin.read"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "GET",
        path: "/products",
        handler: "orders.products",
        config: {
          auth: { scope: ["plugin::order-admin.edit"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "GET",
        path: "/orders/:documentId",
        handler: "orders.findOne",
        config: {
          auth: { scope: ["plugin::order-admin.read"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "PUT",
        path: "/orders/:documentId",
        handler: "orders.edit",
        config: {
          auth: { scope: ["plugin::order-admin.edit"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "POST",
        path: "/orders/:documentId/status",
        handler: "orders.transition",
        config: {
          auth: { scope: ["plugin::order-admin.transition"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "DELETE",
        path: "/orders/:documentId",
        handler: "orders.delete",
        config: {
          auth: { scope: ["plugin::order-admin.delete"] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
    ],
  },
};
