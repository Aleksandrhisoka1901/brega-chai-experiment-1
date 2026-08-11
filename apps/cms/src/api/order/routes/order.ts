export default {
  routes: [
    {
      method: "POST",
      path: "/orders",
      handler: "order.create",
      config: {
        auth: {
          scope: ["api::order.order.create"],
        },
      },
    },
  ],
};
