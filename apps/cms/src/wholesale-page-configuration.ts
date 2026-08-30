export const WHOLESALE_PAGE_UID = "api::wholesale-page.wholesale-page";
export const WHOLESALE_PAGE_PERMISSION_ACTION = `${WHOLESALE_PAGE_UID}.find`;

export const DEFAULT_WHOLESALE_PAGE = {
  title: "Для оптовиков",
  content:
    "<p>Условия поставок, партии и сопровождение для магазинов, монтажников и дистрибьюторов. Напишите нам — подберём линейку под ваш канал продаж.</p>",
  seo: {
    title: "Для оптовиков — Voltora",
    description:
      "Оптовые поставки портативных электростанций и солнечных панелей Voltora для магазинов и партнёров.",
  },
} as const;

export async function ensureWholesalePageConfiguration(strapi: any) {
  const documents = strapi.documents(WHOLESALE_PAGE_UID);
  const [existingPage, publicRole] = await Promise.all([
    documents.findFirst(),
    strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "public" }, populate: ["permissions"] }),
  ]);

  if (!publicRole) throw new Error("Public role was not found");

  const operations: Promise<unknown>[] = [];
  if (!existingPage) {
    operations.push(
      documents.create({ data: DEFAULT_WHOLESALE_PAGE, status: "published" }),
    );
  }

  const hasPermission = (publicRole.permissions ?? []).some(
    (permission: { action?: string }) =>
      permission.action === WHOLESALE_PAGE_PERMISSION_ACTION,
  );
  if (!hasPermission) {
    operations.push(
      strapi.db.query("plugin::users-permissions.permission").create({
        data: {
          action: WHOLESALE_PAGE_PERMISSION_ACTION,
          role: publicRole.id,
        },
      }),
    );
  }

  await Promise.all(operations);
}
