import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::robots-txt.robots-txt", {
  only: ["find"],
  config: {
    find: {
      auth: false,
    },
  },
});
