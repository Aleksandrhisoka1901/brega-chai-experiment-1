import { Archive } from "@strapi/icons";

const pluginId = "order-admin";

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: Archive,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "Заказы",
      },
      permissions: [{ action: `plugin::${pluginId}.read`, subject: null }],
      Component: () =>
        import("./admin/src/App").then((module) => ({
          default: module.App,
        })),
    });

    app.registerPlugin({
      id: pluginId,
      name: "Заказы",
    });
  },
};
