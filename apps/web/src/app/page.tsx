import type { Metadata } from "next";

import { HomeAbout } from "@/components/home-about";
import { HomeArticles } from "@/components/home-articles";
import { HomeHero } from "@/components/home-hero";
import { HomeNabory } from "@/components/home-nabory";
import { HomeTovary } from "@/components/home-tovary";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getHomePage } from "@/server/cms/home";
import { getGlobalSettings } from "@/server/cms/global";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [{ content }, settings] = await Promise.all([
      getHomePage(),
      getGlobalSettings(),
    ]);

    return pageMetadata({
      title: content.seo?.title ?? settings.defaultSeo.title,
      description: content.seo?.description ?? settings.defaultSeo.description,
      imageUrl: content.seo?.imageUrl ?? settings.defaultSeo.imageUrl,
      path: "/",
    });
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return {
      title: "Главная страница временно недоступна",
      robots: { index: false, follow: false },
    };
  }
}

export default async function HomePage() {
  try {
    const [{ content, nabory, tovary, articles }, settings] = await Promise.all(
      [getHomePage(), getGlobalSettings()],
    );

    return (
      <main>
        <HomeHero hero={content.hero} />
        <HomeAbout about={content.about} />
        <HomeTovary
          brandName={settings.brandName}
          eyebrow={content.tovaryPreview.eyebrow}
          imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
          linkLabel={content.tovaryPreview.linkLabel}
          outOfStock={settings.storefrontTexts.outOfStock}
          products={tovary}
          subtitle={content.tovaryPreview.subtitle}
          title={content.tovaryPreview.title}
        />
        <HomeNabory
          brandName={settings.brandName}
          eyebrow={content.naboryPreview.eyebrow}
          imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
          linkLabel={content.naboryPreview.linkLabel}
          outOfStock={settings.storefrontTexts.outOfStock}
          products={nabory}
          subtitle={content.naboryPreview.subtitle}
          title={content.naboryPreview.title}
        />
        <HomeArticles
          articles={articles}
          brandName={settings.brandName}
          eyebrow={content.articlesPreview.eyebrow}
          imagePlaceholder={settings.storefrontTexts.imagePlaceholder}
          linkLabel={content.articlesPreview.linkLabel}
          subtitle={content.articlesPreview.subtitle}
          title={content.articlesPreview.title}
        />
      </main>
    );
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return (
      <main className="holding-page content-frame" data-content-frame>
        <div role="alert">
          <p className="eyebrow">Сервис временно недоступен</p>
          <h1>Главная страница временно недоступна</h1>
          <p>Пожалуйста, попробуйте открыть её немного позже.</p>
        </div>
      </main>
    );
  }
}
