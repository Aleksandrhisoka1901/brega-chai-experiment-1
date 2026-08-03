const PRODUCT_UID = "api::product.product";
const ORDER_UID = "api::order.order";
const HIDDEN_PRODUCT_FIELDS = new Set(["seedKey"]);
const READ_ONLY_PRODUCT_FIELDS = new Set(["slug"]);

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

export const syncAdminContentManager = async (strapi: any) => {
  const service = strapi.plugin("content-manager").service("content-types");
  for (const [uid, configure] of [
    [PRODUCT_UID, configureProductFields],
    [ORDER_UID, configureOrderReadOnlyFields],
  ] as const) {
    const schema = strapi.contentTypes[uid];
    const configuration = await service.findConfiguration(schema);
    await service.updateConfiguration(schema, configure(configuration));
  }
};
