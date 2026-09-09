export const CONFORMITY_PAGE_UID = "api::conformity-page.conformity-page";
export const CONFORMITY_PAGE_PERMISSION_ACTION = `${CONFORMITY_PAGE_UID}.find`;

export const DEFAULT_CONFORMITY_PAGE = {
  title: "Декларация соответствия",
  eyebrow: "Правовая информация",
  content: [
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Поставляемое оборудование сопровождается декларацией соответствия требованиям технических регламентов, применимым к портативным электростанциям и солнечным панелям.",
        },
      ],
    },
    {
      type: "paragraph",
      children: [
        {
          type: "text",
          text: "Актуальный скан декларации направляется по запросу на ",
        },
        {
          type: "link",
          url: "mailto:hello@lon-energy.ru",
          children: [{ type: "text", text: "hello@lon-energy.ru" }],
        },
        {
          type: "text",
          text: " или при оформлении заказа. После регистрации электронной копии документ будет опубликован на этой странице.",
        },
      ],
    },
  ],
  seo: {
    title: "Декларация соответствия — Voltora",
    description:
      "Декларация соответствия на портативные электростанции и солнечные панели. Актуальный документ предоставляется по запросу.",
  },
} as const;

export async function ensureConformityPageConfiguration(strapi: any) {
  const documents = strapi.documents(CONFORMITY_PAGE_UID);
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
      documents.create({ data: DEFAULT_CONFORMITY_PAGE, status: "published" }),
    );
  }

  const hasPermission = (publicRole.permissions ?? []).some(
    (permission: { action?: string }) =>
      permission.action === CONFORMITY_PAGE_PERMISSION_ACTION,
  );
  if (!hasPermission) {
    operations.push(
      strapi.db.query("plugin::users-permissions.permission").create({
        data: {
          action: CONFORMITY_PAGE_PERMISSION_ACTION,
          role: publicRole.id,
        },
      }),
    );
  }

  await Promise.all(operations);
}
