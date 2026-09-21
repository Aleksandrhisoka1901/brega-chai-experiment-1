import { Archive, Message } from "@strapi/icons";

const pluginId = "order-admin";

const pluginApp = () =>
  import("./admin/src/App").then((module) => ({
    default: module.App,
  }));

const inquiriesApp = () =>
  import("./admin/src/App").then((module) => ({
    default: module.InquiriesApp,
  }));

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
      Component: pluginApp,
    });

    app.addMenuLink({
      to: `plugins/${pluginId}/inquiries`,
      icon: Message,
      intlLabel: {
        id: `${pluginId}.plugin.inquiries`,
        defaultMessage: "Заявки",
      },
      permissions: [{ action: `plugin::${pluginId}.read`, subject: null }],
      Component: inquiriesApp,
    });

    app.registerPlugin({
      id: pluginId,
      name: "Заказы",
    });
  },
};
