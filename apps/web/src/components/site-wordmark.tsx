import type { GlobalSettings } from "@/server/cms/global-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { LonEnergyMark } from "./lon-energy-mark";

export function SiteWordmark({
  brandName,
}: Pick<GlobalSettings, "brandName" | "logo">) {
  return (
    <span className="site-logo">
      <LonEnergyMark className="site-logo__mark" />
      <span className="site-logo__word">
        {bindShortRussianWords(brandName)}
      </span>
    </span>
  );
}
