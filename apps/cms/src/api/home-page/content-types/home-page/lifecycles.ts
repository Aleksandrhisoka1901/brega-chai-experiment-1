import { validateHeroImage } from "./validation.js";

interface HomePageEvent {
  params: {
    data?: {
      hero?: {
        layout?: "50/50" | "40/60" | "100/0";
        image?: unknown;
      };
    };
  };
}

function validate(event: HomePageEvent) {
  validateHeroImage(event.params.data?.hero);
}

export default {
  beforeCreate: validate,
  beforeUpdate: validate,
};
