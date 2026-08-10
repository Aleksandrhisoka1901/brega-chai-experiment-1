const PRODUCT_UID = "api::product.product";
const ORDER_UID = "api::order.order";
const HIDDEN_PRODUCT_FIELDS = new Set(["seedKey"]);
const READ_ONLY_PRODUCT_FIELDS = new Set(["slug"]);
const SYSTEM_FIELD_LABELS = {
  id: "Идентификатор",
  documentId: "Идентификатор документа",
  createdAt: "Создано",
  updatedAt: "Обновлено",
  createdBy: "Создал",
  updatedBy: "Обновил",
} as const;

type EditField = {
  name: string;
  size: number;
};

type ContentManagerConfiguration = {
  layouts: {
    edit: EditField[][];
    list: string[];
  };
  settings: Record<string, unknown>;
  metadatas: Record<
    string,
    {
      edit: Record<string, unknown>;
      list: Record<string, unknown>;
    }
  >;
};

type FieldLabels = Record<string, string>;
type AdminTranslations = Readonly<Record<string, string>>;
type ContentManagerPreset = Pick<ContentManagerConfiguration, "layouts"> & {
  settings?: Record<string, unknown>;
};

const CONTENT_MANAGER_PRESETS: Record<string, ContentManagerPreset> = {
  "api::global-setting.global-setting": {
    layouts: {
      edit: [
        [
          { name: "brandName", size: 6 },
          { name: "logo", size: 6 },
        ],
        [
          { name: "email", size: 6 },
          { name: "telegramUrl", size: 6 },
        ],
        [{ name: "defaultProductStory", size: 12 }],
        [{ name: "navigation", size: 12 }],
        [{ name: "currency", size: 6 }],
        [{ name: "defaultSeo", size: 12 }],
        [
          { name: "legalDetails", size: 6 },
          { name: "orderNotificationEmail", size: 6 },
        ],
        [
          { name: "pickupAddress", size: 6 },
          { name: "pickupDiscountPercent", size: 4 },
        ],
        [{ name: "courierDeliveryNote", size: 6 }],
        [{ name: "sectionBreadcrumbs", size: 12 }],
        [{ name: "storefrontTexts", size: 12 }],
        [{ name: "legalDocuments", size: 12 }],
      ],
      list: ["id", "brandName", "logo", "email"],
    },
  },
  "api::order.order": {
    layouts: {
      edit: [
        [
          { name: "orderNumber", size: 6 },
          { name: "idempotencyKey", size: 6 },
        ],
        [{ name: "requestFingerprint", size: 6 }],
        [
          { name: "customerName", size: 6 },
          { name: "customerPhone", size: 6 },
        ],
        [
          { name: "customerEmail", size: 6 },
          { name: "deliveryAddress", size: 6 },
        ],
        [{ name: "comment", size: 6 }],
        [{ name: "consents", size: 12 }],
        [{ name: "lines", size: 12 }],
        [
          { name: "currency", size: 6 },
          { name: "totalRubles", size: 4 },
        ],
        [{ name: "statusHistory", size: 12 }],
        [
          { name: "orderStatus", size: 6 },
          { name: "deliveryMethod", size: 6 },
        ],
        [
          { name: "pickupDiscountPercent", size: 4 },
          { name: "discountedTotalRubles", size: 4 },
        ],
        [{ name: "managerComment", size: 6 }],
      ],
      list: ["id", "orderNumber", "idempotencyKey", "requestFingerprint"],
    },
  },
  "api::product.product": {
    layouts: {
      edit: [
        [{ name: "title", size: 6 }],
        [
          { name: "slug", size: 6 },
          { name: "type", size: 6 },
        ],
        [
          { name: "originalTitle", size: 6 },
          { name: "packageLabel", size: 6 },
        ],
        [
          { name: "price", size: 4 },
          { name: "currency", size: 6 },
        ],
        [{ name: "stock", size: 4 }],
        [{ name: "mainImage", size: 12 }],
        [{ name: "gallery", size: 12 }],
        [
          { name: "cardExcerpt", size: 6 },
          { name: "story", size: 6 },
        ],
        [{ name: "articles", size: 12 }],
        [{ name: "seo", size: 12 }],
        [
          { name: "breadcrumbLabel", size: 6 },
          { name: "categoryLabel", size: 6 },
        ],
        [{ name: "displayName", size: 6 }],
      ],
      list: ["id", "title", "slug", "breadcrumbLabel", "displayName"],
    },
  },
  "api::products-page.products-page": {
    layouts: {
      edit: [
        [{ name: "seo", size: 12 }],
        [{ name: "title", size: 6 }],
        [{ name: "intro", size: 12 }],
        [
          { name: "eyebrow", size: 6 },
          { name: "emptyStateText", size: 6 },
        ],
        [{ name: "emptyStateLinkLabel", size: 6 }],
      ],
      list: ["id", "seo", "title"],
    },
  },
  "home.catalog-preview": {
    layouts: {
      edit: [
        [
          { name: "title", size: 6 },
          { name: "subtitle", size: 6 },
        ],
        [
          { name: "eyebrow", size: 6 },
          { name: "linkLabel", size: 6 },
        ],
      ],
      list: ["id", "title", "subtitle", "eyebrow"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "home.editorial-section": {
    layouts: {
      edit: [
        [
          { name: "backgroundColor", size: 6 },
          { name: "textColor", size: 6 },
        ],
        [
          { name: "spacing", size: 6 },
          { name: "eyebrow", size: 6 },
        ],
        [
          { name: "title", size: 6 },
          { name: "textBlock1", size: 6 },
        ],
        [{ name: "textBlock2", size: 6 }],
      ],
      list: ["id", "backgroundColor", "textColor"],
    },
    settings: {
      mainField: "backgroundColor",
      defaultSortBy: "backgroundColor",
    },
  },
  "home.hero": {
    layouts: {
      edit: [
        [
          { name: "title", size: 6 },
          { name: "text", size: 6 },
        ],
        [{ name: "layout", size: 6 }],
        [{ name: "image", size: 12 }],
        [
          { name: "backgroundColor", size: 6 },
          { name: "textColor", size: 6 },
        ],
        [{ name: "cta", size: 12 }],
        [{ name: "eyebrow", size: 6 }],
      ],
      list: ["id", "title", "text", "layout"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "shared.navigation-labels": {
    layouts: {
      edit: [
        [{ name: "about", size: 6 }],
        [
          { name: "cart", size: 6 },
          { name: "nabory", size: 6 },
        ],
        [{ name: "tovary", size: 6 }],
      ],
      list: ["id", "about", "nabory", "tovary"],
    },
  },
};

export const applyAdminContentManagerPreset = (
  uid: string,
  configuration: ContentManagerConfiguration,
): ContentManagerConfiguration => {
  const preset = CONTENT_MANAGER_PRESETS[uid];
  if (!preset) return configuration;

  return {
    ...configuration,
    layouts: preset.layouts,
    settings: { ...configuration.settings, ...preset.settings },
  };
};

export const getRussianFieldLabels = (
  uid: string,
  isComponent: boolean,
  translations: AdminTranslations,
): FieldLabels => {
  const prefix = isComponent
    ? `content-manager.components.${uid}.`
    : `content-manager.content-types.${uid}.`;

  const translatedLabels = Object.fromEntries(
    Object.entries(translations).flatMap(([key, label]) =>
      key.startsWith(prefix) ? [[key.slice(prefix.length), label]] : [],
    ),
  );

  return { ...SYSTEM_FIELD_LABELS, ...translatedLabels };
};

export const applyRussianFieldLabels = (
  configuration: ContentManagerConfiguration,
  labels: FieldLabels,
): ContentManagerConfiguration => ({
  layouts: configuration.layouts,
  settings: configuration.settings,
  metadatas: Object.fromEntries(
    Object.entries(configuration.metadatas).map(([name, metadata]) => {
      const label = labels[name];
      if (!label) return [name, metadata];

      return [
        name,
        {
          edit: { ...metadata.edit, label },
          list: { ...metadata.list, label },
        },
      ];
    }),
  ),
});

export const configureProductFields = (
  configuration: ContentManagerConfiguration,
): ContentManagerConfiguration => ({
  layouts: {
    edit: configuration.layouts.edit
      .map((row) =>
        row.filter((field) => !HIDDEN_PRODUCT_FIELDS.has(field.name)),
      )
      .filter((row) => row.length > 0),
    list: [
      ...configuration.layouts.list.filter(
        (field) => !HIDDEN_PRODUCT_FIELDS.has(field),
      ),
      ...(configuration.layouts.list.includes("displayName")
        ? []
        : ["displayName"]),
    ],
  },
  metadatas: Object.fromEntries(
    Object.entries(configuration.metadatas).map(([name, metadata]) => {
      if (HIDDEN_PRODUCT_FIELDS.has(name)) {
        return [
          name,
          {
            ...metadata,
            edit: {
              ...metadata.edit,
              visible: false,
              editable: false,
            },
          },
        ];
      }

      if (READ_ONLY_PRODUCT_FIELDS.has(name)) {
        return [
          name,
          {
            ...metadata,
            edit: { ...metadata.edit, visible: true, editable: false },
          },
        ];
      }

      return [name, metadata];
    }),
  ),
  settings: configuration.settings,
});

export const configureOrderReadOnlyFields = (
  configuration: ContentManagerConfiguration,
): ContentManagerConfiguration => ({
  ...configuration,
  metadatas: Object.fromEntries(
    Object.entries(configuration.metadatas).map(([name, metadata]) => [
      name,
      {
        ...metadata,
        edit: { ...metadata.edit, editable: false },
      },
    ]),
  ),
});

export const syncAdminContentManager = async (
  strapi: any,
  translations: AdminTranslations,
) => {
  const plugin = strapi.plugin("content-manager");
  const contentTypeService = plugin.service("content-types");
  for (const uid of Object.keys(strapi.contentTypes)) {
    const labels = getRussianFieldLabels(uid, false, translations);
    if (Object.keys(labels).length === 0) continue;

    const schema = strapi.contentTypes[uid];
    const configuration = applyAdminContentManagerPreset(
      uid,
      await contentTypeService.findConfiguration(schema),
    );
    const configured =
      uid === PRODUCT_UID
        ? configureProductFields(configuration)
        : uid === ORDER_UID
          ? configureOrderReadOnlyFields(configuration)
          : configuration;
    await contentTypeService.updateConfiguration(
      schema,
      applyRussianFieldLabels(configured, labels),
    );
  }

  const componentService = plugin.service("components");
  for (const uid of Object.keys(strapi.components)) {
    const labels = getRussianFieldLabels(uid, true, translations);
    if (Object.keys(labels).length === 0) continue;

    const schema = strapi.components[uid];
    const configuration = applyAdminContentManagerPreset(
      uid,
      await componentService.findConfiguration(schema),
    );
    await componentService.updateConfiguration(
      schema,
      applyRussianFieldLabels(configuration, labels),
    );
  }
};
