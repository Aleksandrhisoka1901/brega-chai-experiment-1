export const RITUALS_PAGE_UID = "api::rituals-page.rituals-page";
export const RITUALS_PAGE_PERMISSION_ACTION = `${RITUALS_PAGE_UID}.find`;

export const DEFAULT_RITUALS_PAGE = {
  eyebrow: "Глава 03",
  title: "Солнечные панели",
  intro:
    "Складные панели, чтобы продлить автономность станции на даче, в поездке и при перебоях с сетью.",
  emptyStateText: "Панели скоро появятся.",
  emptyStateLinkLabel: "Вернуться на главную",
  seo: {
    title: "Солнечные панели — Brega",
    description: "Складные солнечные панели для зарядки портативных электростанций.",
  },
} as const;

export async function ensureRitualsPageConfiguration(strapi: any) {
  const documents = strapi.documents(RITUALS_PAGE_UID);
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
      documents.create({ data: DEFAULT_RITUALS_PAGE, status: "published" }),
    );
  }

  const hasPermission = (publicRole.permissions ?? []).some(
    (permission: { action?: string }) =>
      permission.action === RITUALS_PAGE_PERMISSION_ACTION,
  );
  if (!hasPermission) {
    operations.push(
      strapi.db.query("plugin::users-permissions.permission").create({
        data: {
          action: RITUALS_PAGE_PERMISSION_ACTION,
          role: publicRole.id,
        },
      }),
    );
  }

  await Promise.all(operations);
}
