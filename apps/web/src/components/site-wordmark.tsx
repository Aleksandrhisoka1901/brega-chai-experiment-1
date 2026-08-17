import type { GlobalSettings } from "@/server/cms/global-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { ResponsiveImage } from "./responsive-image";

export function SiteWordmark({
  brandName,
  logo,
}: Pick<GlobalSettings, "brandName" | "logo">) {
  if (!logo) return <>{bindShortRussianWords(brandName)}</>;

  return (
    <ResponsiveImage
      alt={brandName}
      height={logo.height}
      sizes="160px"
      src={logo.url}
      sources={logo.sources}
      width={logo.width}
    />
  );
}
