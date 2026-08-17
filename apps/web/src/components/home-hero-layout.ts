import type { HomePageContent } from "@/server/cms/home-mapper";

type HeroLayout = HomePageContent["hero"]["layout"];
type HeroLayoutConfig =
  | { hasMedia: true; imageSizes: string }
  | { hasMedia: false };

export const HERO_LAYOUT_CONFIG = {
  "40/60": {
    hasMedia: true,
    imageSizes: "(max-width: 1023px) 100vw, (max-width: 1600px) 60vw, 960px",
  },
  "50/50": {
    hasMedia: true,
    imageSizes: "(max-width: 1023px) 100vw, (max-width: 1600px) 50vw, 800px",
  },
  "100/0": { hasMedia: false },
} as const satisfies Record<HeroLayout, HeroLayoutConfig>;
