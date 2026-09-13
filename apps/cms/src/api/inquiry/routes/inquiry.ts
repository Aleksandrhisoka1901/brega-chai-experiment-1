export default {
  routes: [
    {
      method: "POST",
      path: "/inquiries",
      handler: "inquiry.create",
      config: {
        auth: {
          scope: ["api::inquiry.inquiry.create"],
        },
      },
    },
  ],
};
