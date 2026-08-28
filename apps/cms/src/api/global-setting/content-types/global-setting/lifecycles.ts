import { validateUniqueBreadcrumbRoutes } from "./validation.js";

type GlobalSettingEvent = {
  params: {
    data?: {
      sectionBreadcrumbs?: Array<{
        route?: "stantsii" | "paneli" | "stati";
        label?: string;
      }>;
    };
  };
};

function validate(event: GlobalSettingEvent) {
  validateUniqueBreadcrumbRoutes(event.params.data?.sectionBreadcrumbs);
}

export default {
  beforeCreate: validate,
  beforeUpdate: validate,
};
