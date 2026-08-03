import type { GlobalSettings } from "@/server/cms/global-mapper";

export function SiteWordmark({
  brandName,
  logo,
}: Pick<GlobalSettings, "brandName" | "logo">) {
  if (!logo) return <>{brandName}</>;

  return (
    <img
      alt={brandName}
      height={logo.height}
      src={logo.url}
      srcSet={logo.sources
        .map((source) => `${source.url} ${source.width}w`)
        .join(", ")}
      width={logo.width}
    />
  );
}
