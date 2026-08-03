export default {
  async readiness(ctx: any) {
    try {
      await strapi.db.connection.raw("SELECT 1");
      ctx.status = 204;
    } catch (error) {
      strapi.log.error("Readiness check failed", error);
      ctx.status = 503;
      ctx.body = { status: "unavailable" };
    }
  },
};
