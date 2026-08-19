type DocumentStatus = "draft" | "published";

type GlobalSettingDocument = {
  documentId: string;
  maxItemQuantity?: number | null;
  sectionBreadcrumbs?: Array<{ route: "tovary" | "nabory"; label: string }>;
  storefrontTexts?: {
    imagePlaceholder?: string;
    outOfStock?: string;
  };
};

const DEFAULT_BREADCRUMBS = [
  { route: "tovary" as const, label: "Сорта" },
  { route: "nabory" as const, label: "Ритуалы" },
];

const DEFAULT_STOREFRONT_TEXTS = {
  imagePlaceholder: "Изображение готовится",
  outOfStock: "Нет в наличии",
};

export async function ensureGlobalContentDefaults(strapi: any) {
  const documents = strapi.documents("api::global-setting.global-setting");

  for (const status of ["draft", "published"] satisfies DocumentStatus[]) {
    const settings = (await documents.findMany({
      status,
      populate: ["sectionBreadcrumbs", "storefrontTexts"],
    })) as GlobalSettingDocument[];

    for (const setting of settings) {
      const data: Partial<GlobalSettingDocument> = {};
      if (!setting.maxItemQuantity) {
        data.maxItemQuantity = 5;
      }
      if (!setting.sectionBreadcrumbs?.length) {
        data.sectionBreadcrumbs = DEFAULT_BREADCRUMBS;
      }
      if (
        !setting.storefrontTexts?.imagePlaceholder?.trim() ||
        !setting.storefrontTexts?.outOfStock?.trim()
      ) {
        data.storefrontTexts = DEFAULT_STOREFRONT_TEXTS;
      }

      if (Object.keys(data).length > 0) {
        await documents.update({
          documentId: setting.documentId,
          status,
          data,
        });
      }
    }
  }
}
