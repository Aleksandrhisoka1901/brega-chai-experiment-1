export interface HeroInput {
  layout?: "50/50" | "40/60" | "100/0";
  image?: unknown;
}

export function validateHeroImage(hero: HeroInput | null | undefined): void {
  if (hero?.layout && hero.layout !== "100/0" && !hero.image) {
    throw new Error("Hero image and alt are required for split layouts");
  }
}
