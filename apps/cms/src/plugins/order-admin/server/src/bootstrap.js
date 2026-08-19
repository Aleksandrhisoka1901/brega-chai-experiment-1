"use strict";

module.exports = async ({ strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: "plugins",
      displayName: "Просмотр заказов",
      uid: "read",
      pluginName: "order-admin",
    },
    {
      section: "plugins",
      displayName: "Изменение статуса заказа",
      uid: "transition",
      pluginName: "order-admin",
    },
    {
      section: "plugins",
      displayName: "Редактирование заказа",
      uid: "edit",
      pluginName: "order-admin",
    },
    {
      section: "plugins",
      displayName: "Удаление заказа",
      uid: "delete",
      pluginName: "order-admin",
    },
  ]);
};
