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
  metadatas?: Record<
    string,
    {
      edit?: Record<string, unknown>;
      list?: Record<string, unknown>;
    }
  >;
};

const CONTENT_MANAGER_PRESETS: Record<string, ContentManagerPreset> = {
  "api::global-setting.global-setting": {
    layouts: {
      edit: [
        [
          { name: "brandName", size: 8 },
          { name: "currency", size: 4 },
        ],
        [{ name: "logo", size: 12 }],
        [
          { name: "email", size: 6 },
          { name: "telegramUrl", size: 6 },
        ],
        [{ name: "navigation", size: 12 }],
        [{ name: "storefrontTexts", size: 12 }],
        [
          { name: "pickupAddress", size: 8 },
          { name: "pickupDiscountPercent", size: 4 },
        ],
        [
          { name: "courierDeliveryNote", size: 6 },
          { name: "orderNotificationEmail", size: 6 },
        ],
        [{ name: "defaultProductStory", size: 12 }],
        [{ name: "sectionBreadcrumbs", size: 12 }],
        [{ name: "defaultSeo", size: 12 }],
        [{ name: "legalDetails", size: 12 }],
        [{ name: "legalDocuments", size: 12 }],
      ],
      list: ["id", "brandName", "logo", "email"],
    },
  },
  "api::home-page.home-page": {
    layouts: {
      edit: [
        [{ name: "hero", size: 12 }],
        [{ name: "about", size: 12 }],
        [{ name: "naboryPreview", size: 12 }],
        [{ name: "featuredNabory", size: 12 }],
        [{ name: "tovaryPreview", size: 12 }],
        [{ name: "featuredTovary", size: 12 }],
        [{ name: "seo", size: 12 }],
      ],
      list: ["id", "hero", "about"],
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
        [
          { name: "title", size: 6 },
          { name: "displayName", size: 6 },
        ],
        [
          { name: "slug", size: 8 },
          { name: "type", size: 4 },
        ],
        [
          { name: "originalTitle", size: 6 },
          { name: "packageLabel", size: 6 },
        ],
        [
          { name: "price", size: 4 },
          { name: "stock", size: 4 },
          { name: "currency", size: 4 },
        ],
        [{ name: "cardExcerpt", size: 12 }],
        [{ name: "story", size: 12 }],
        [{ name: "mainImage", size: 12 }],
        [{ name: "gallery", size: 12 }],
        [{ name: "articles", size: 12 }],
        [
          { name: "breadcrumbLabel", size: 6 },
          { name: "categoryLabel", size: 6 },
        ],
        [{ name: "seo", size: 12 }],
      ],
      list: [
        "id",
        "title",
        "displayName",
        "type",
        "price",
        "stock",
        "updatedAt",
      ],
    },
  },
  "api::products-page.products-page": {
    layouts: {
      edit: [
        [
          { name: "eyebrow", size: 4 },
          { name: "title", size: 8 },
        ],
        [{ name: "intro", size: 12 }],
        [
          { name: "emptyStateText", size: 8 },
          { name: "emptyStateLinkLabel", size: 4 },
        ],
        [{ name: "seo", size: 12 }],
      ],
      list: ["id", "title", "eyebrow", "updatedAt"],
    },
    metadatas: {
      intro: { list: { searchable: false, sortable: false } },
    },
  },
  "home.catalog-preview": {
    layouts: {
      edit: [
        [
          { name: "eyebrow", size: 4 },
          { name: "title", size: 8 },
        ],
        [
          { name: "subtitle", size: 8 },
          { name: "linkLabel", size: 4 },
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
          { name: "eyebrow", size: 4 },
          { name: "title", size: 8 },
        ],
        [
          { name: "textBlock1", size: 6 },
          { name: "textBlock2", size: 6 },
        ],
        [
          { name: "spacing", size: 4 },
          { name: "backgroundColor", size: 4 },
          { name: "textColor", size: 4 },
        ],
      ],
      list: ["id", "title", "eyebrow", "spacing"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "home.hero": {
    layouts: {
      edit: [
        [
          { name: "eyebrow", size: 4 },
          { name: "title", size: 8 },
        ],
        [{ name: "text", size: 12 }],
        [
          { name: "layout", size: 4 },
          { name: "backgroundColor", size: 4 },
          { name: "textColor", size: 4 },
        ],
        [{ name: "image", size: 12 }],
        [{ name: "cta", size: 12 }],
      ],
      list: ["id", "title", "text", "layout"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "home.rituals-preview": {
    layouts: {
      edit: [
        [
          { name: "eyebrow", size: 4 },
          { name: "title", size: 8 },
        ],
        [{ name: "subtitle", size: 12 }],
      ],
      list: ["id", "title", "subtitle", "eyebrow"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "product.article": {
    layouts: {
      edit: [[{ name: "content", size: 12 }]],
      list: ["id", "content"],
    },
  },
  "product.gallery-image": {
    layouts: {
      edit: [
        [
          { name: "image", size: 6 },
          { name: "alt", size: 6 },
        ],
      ],
      list: ["id", "alt", "image"],
    },
    settings: { mainField: "alt", defaultSortBy: "alt" },
  },
  "shared.image-with-alt": {
    layouts: {
      edit: [
        [
          { name: "image", size: 6 },
          { name: "alt", size: 6 },
        ],
      ],
      list: ["id", "alt", "image"],
    },
    settings: { mainField: "alt", defaultSortBy: "alt" },
  },
  "shared.legal-documents": {
    layouts: {
      edit: [
        [{ name: "privacyPolicy", size: 12 }],
        [{ name: "terms", size: 12 }],
        [{ name: "deliveryAndReturns", size: 12 }],
      ],
      list: ["id", "privacyPolicy", "terms", "deliveryAndReturns"],
    },
  },
  "shared.link": {
    layouts: {
      edit: [
        [
          { name: "label", size: 4 },
          { name: "url", size: 8 },
        ],
      ],
      list: ["id", "label", "url"],
    },
    settings: { mainField: "label", defaultSortBy: "label" },
  },
  "shared.navigation-labels": {
    layouts: {
      edit: [
        [
          { name: "about", size: 6 },
          { name: "cart", size: 6 },
        ],
        [
          { name: "nabory", size: 6 },
          { name: "tovary", size: 6 },
        ],
      ],
      list: ["id", "about", "nabory", "tovary"],
    },
  },
  "shared.section-breadcrumb": {
    layouts: {
      edit: [
        [
          { name: "route", size: 4 },
          { name: "label", size: 8 },
        ],
      ],
      list: ["id", "route", "label"],
    },
    settings: { mainField: "label", defaultSortBy: "label" },
  },
  "shared.seo": {
    layouts: {
      edit: [
        [{ name: "title", size: 12 }],
        [{ name: "description", size: 12 }],
        [{ name: "image", size: 12 }],
      ],
      list: ["id", "title", "description", "image"],
    },
    settings: { mainField: "title", defaultSortBy: "title" },
  },
  "shared.storefront-texts": {
    layouts: {
      edit: [
        [
          { name: "imagePlaceholder", size: 6 },
          { name: "outOfStock", size: 6 },
        ],
      ],
      list: ["id", "imagePlaceholder", "outOfStock"],
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
    metadatas: Object.fromEntries(
      Object.entries(configuration.metadatas).map(([name, metadata]) => {
        const override = preset.metadatas?.[name];
        if (!override) return [name, metadata];

        return [
          name,
          {
            edit: { ...metadata.edit, ...override.edit },
            list: { ...metadata.list, ...override.list },
          },
        ];
      }),
    ),
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
