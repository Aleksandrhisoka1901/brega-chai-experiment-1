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
    const configuration = await contentTypeService.findConfiguration(schema);
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
    const configuration = await componentService.findConfiguration(schema);
    await componentService.updateConfiguration(
      schema,
      applyRussianFieldLabels(configuration, labels),
    );
  }
};
