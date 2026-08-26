import type { Metadata } from "next";
import Link from "next/link";

import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
} from "@/lib/seo/structured-data";
import { bindShortRussianWords } from "@/lib/typography";
import { getArticleBySlug, getArticles } from "@/server/cms/articles";
import { getArticlesPage } from "@/server/cms/articles-page";
import type { ArticleCard } from "@/server/cms/article-mapper";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getGlobalSettings } from "@/server/cms/global";
import type { ProductsPageContent } from "@/server/cms/products-page-mapper";

import { ArticleGrid } from "./article-grid";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { JsonLd } from "./json-ld";

function assertExpectedCmsError(result: PromiseSettledResult<unknown>) {
  if (
    result.status === "rejected" &&
    !(result.reason instanceof CmsUnavailableError)
  ) {
    throw result.reason;
  }
}

export async function articlesLandingMetadata(): Promise<Metadata> {
  try {
    const [content, settings] = await Promise.all([
      getArticlesPage(),
      getGlobalSettings(),
    ]);

    return pageMetadata({
      title: content.seo?.title ?? settings.defaultSeo.title ?? content.title,
      description: content.seo?.description ?? settings.defaultSeo.description,
      imageUrl: content.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: "/stati",
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return {
      title: "Статьи временно недоступны",
      robots: { index: false, follow: false },
    };
  }
}

export async function articleItemMetadata(slug: string): Promise<Metadata> {
  try {
    const [article, settings] = await Promise.all([
      getArticleBySlug(slug),
      getGlobalSettings(),
    ]);
    if (!article) return {};

    return pageMetadata({
      title:
        article.seo?.title ??
        settings.defaultSeo.title ??
        `${article.name} — ${settings.brandName}`,
      description:
        article.seo?.description ??
        settings.defaultSeo.description ??
        article.name,
      imageUrl:
        article.seo?.imageUrl ??
        article.image?.url ??
        settings.defaultSeo.imageUrl,
      path: `/stati/${article.slug}`,
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return {
      title: "Статья временно недоступна",
      robots: { index: false, follow: false },
    };
  }
}

export async function ArticlesLandingPage() {
  const [contentResult, articlesResult, settings] = await Promise.all([
    getArticlesPage()
      .then((value) => ({ status: "fulfilled" as const, value }))
      .catch((reason: unknown) => ({ status: "rejected" as const, reason })),
    getArticles()
      .then((value) => ({ status: "fulfilled" as const, value }))
      .catch((reason: unknown) => ({ status: "rejected" as const, reason })),
    getGlobalSettings(),
  ]);

  assertExpectedCmsError(contentResult);
  assertExpectedCmsError(articlesResult);

  const content: ProductsPageContent | null =
    contentResult.status === "fulfilled" ? contentResult.value : null;
  const articles: ArticleCard[] =
    articlesResult.status === "fulfilled" ? articlesResult.value : [];
  const contentUnavailable = contentResult.status === "rejected";
  const articlesUnavailable = articlesResult.status === "rejected";
  const sectionLabel = settings.sectionBreadcrumbs.stati;
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Главная", href: "/" },
    { name: sectionLabel, href: "/stati" },
  ];

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
          name: content?.title ?? sectionLabel,
          description: content?.intro,
          url: canonicalUrl("/stati"),
        })}
      />
      <section
        className="catalog-intro content-frame"
        data-content-frame
        data-has-eyebrow={Boolean(content?.eyebrow)}
      >
        <Breadcrumbs items={breadcrumbs} />
        {content?.eyebrow ? (
          <p className="eyebrow">{bindShortRussianWords(content.eyebrow)}</p>
        ) : null}
        {contentUnavailable ? (
          <div className="catalog-intro__state" role="alert">
            <h1>Вступление временно недоступно</h1>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : content ? (
          <>
            <h1>{bindShortRussianWords(content.title)}</h1>
            <div className="catalog-intro__text">
              <p>{bindShortRussianWords(content.intro)}</p>
            </div>
          </>
        ) : null}
      </section>
      <section
        className="catalog-section content-frame"
        data-content-frame
        aria-label={sectionLabel}
      >
        {articlesUnavailable ? (
          <div className="catalog-state" role="alert">
            <p>Статьи временно недоступны.</p>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="catalog-state">
            <p>
              {bindShortRussianWords(
                content?.emptyStateText ?? "Статьи скоро появятся.",
              )}
            </p>
            <Link href="/">
              {bindShortRussianWords(
                content?.emptyStateLinkLabel ?? "Вернуться на главную",
              )}
            </Link>
          </div>
        ) : (
          <ArticleGrid
            articles={articles}
            brandName={settings.brandName}
            imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
          />
        )}
      </section>
    </main>
  );
}
