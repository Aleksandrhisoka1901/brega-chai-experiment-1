const PUBLIC_RELATED_ACTIONS = [
  "api::article.article.find",
  "api::article.article.findOne",
  "api::product.product.find",
  "api::product.product.findOne",
] as const;

export async function ensureRelatedItemsPermissions(strapi: any) {
  const publicRole = await strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "public" }, populate: ["permissions"] });

  if (!publicRole) throw new Error("Public role was not found");

  const existingActions = new Set(
    (publicRole.permissions ?? []).map(
      (permission: { action?: string }) => permission.action,
    ),
  );

  await Promise.all(
    PUBLIC_RELATED_ACTIONS.filter((action) => !existingActions.has(action)).map(
      (action) =>
        strapi.db.query("plugin::users-permissions.permission").create({
          data: { action, role: publicRole.id },
        }),
    ),
  );
}
