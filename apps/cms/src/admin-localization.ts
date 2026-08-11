const RUSSIAN_ADMIN_LOCALE = "ru";

export const ensureRussianAdminLocale = async (strapi: any) => {
  await strapi.db.query("admin::user").updateMany({
    where: { preferedLanguage: { $null: true } },
    data: { preferedLanguage: RUSSIAN_ADMIN_LOCALE },
  });

  strapi.db.lifecycles.subscribe({
    models: ["admin::user"],
    beforeCreate(event: { params: { data: { preferedLanguage?: string } } }) {
      if (!event.params.data.preferedLanguage) {
        event.params.data.preferedLanguage = RUSSIAN_ADMIN_LOCALE;
      }
    },
  });
};
