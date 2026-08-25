import { validateUniqueBreadcrumbRoutes } from "./validation.js";

type GlobalSettingEvent = {
  params: {
    data?: {
      sectionBreadcrumbs?: Array<{
        route?: "tovary" | "nabory" | "stati";
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
