export default {
  routes: [
    {
      method: "GET",
      path: "/health/readiness",
      handler: "health.readiness",
      config: { auth: false },
    },
  ],
};
