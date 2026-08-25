import { notFound } from "next/navigation";

import { canonicalUrl } from "@/lib/seo/metadata";
import {
  articleStructuredData,
  breadcrumbStructuredData,
} from "@/lib/seo/structured-data";
import { getArticleBySlug } from "@/server/cms/articles";
import { getGlobalSettings } from "@/server/cms/global";

import { ArticleDetail } from "./article-detail";
import { JsonLd } from "./json-ld";

export async function ArticleItemPage({ slug }: { slug: string }) {
  const [article, settings] = await Promise.all([
    getArticleBySlug(slug),
    getGlobalSettings(),
  ]);
  if (!article) notFound();

  const breadcrumbs = [
    { name: "Главная", href: "/" },
    { name: settings.sectionBreadcrumbs.stati, href: "/stati" },
    { name: article.name, href: `/stati/${article.slug}` },
  ];
  const url = canonicalUrl(`/stati/${article.slug}`);

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
        data={articleStructuredData({
          headline: article.name,
          description: article.seo?.description ?? article.name,
          url,
          imageUrl: article.seo?.imageUrl ?? article.image?.url,
          brandName: settings.brandName,
        })}
      />
      <ArticleDetail
        article={article}
        breadcrumbs={breadcrumbs}
        imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
      />
    </main>
  );
}
