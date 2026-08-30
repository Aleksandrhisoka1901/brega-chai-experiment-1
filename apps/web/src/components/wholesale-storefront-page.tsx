import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { safeHtmlToText } from "@/lib/html/safe-html";
import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
} from "@/lib/seo/structured-data";
import { WHOLESALE_PATH } from "@/lib/storefront-routes";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getGlobalSettings } from "@/server/cms/global";
import { getWholesalePage } from "@/server/cms/wholesale-page";

import { ArticleDetail } from "./article-detail";
import { JsonLd } from "./json-ld";

export async function wholesalePageMetadata(): Promise<Metadata> {
  try {
    const [page, settings] = await Promise.all([
      getWholesalePage(),
      getGlobalSettings(),
    ]);
    if (!page) return {};

    return pageMetadata({
      title: page.seo?.title ?? `${page.name} — ${settings.brandName}`,
      description:
        page.seo?.description ??
        settings.defaultSeo.description ??
        page.name,
      imageUrl: page.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: WHOLESALE_PATH,
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return {
      title: "Страница временно недоступна",
      robots: { index: false, follow: false },
    };
  }
}

export async function WholesaleStorefrontPage() {
  const page = await getWholesalePage();
  if (!page) notFound();

  const breadcrumbs = [
    { name: "Главная", href: "/" },
    { name: page.name, href: WHOLESALE_PATH },
  ];
  const url = canonicalUrl(WHOLESALE_PATH);

  return (
    <main>
      <JsonLd
        data={breadcrumbStructuredData(
          breadcrumbs.map((item) => ({
            name: item.name,
            url: canonicalUrl(item.href),
          })),
        )}
      />
      <JsonLd
        data={collectionPageStructuredData({
          name: page.name,
          description:
            page.seo?.description ??
            (page.content ? safeHtmlToText(page.content) : page.name),
          url,
        })}
      />
      <ArticleDetail article={page} breadcrumbs={breadcrumbs} />
    </main>
  );
}
