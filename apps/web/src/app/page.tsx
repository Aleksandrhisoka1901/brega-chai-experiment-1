import { HomeAbout } from "@/components/home-about";
import { HomeHero } from "@/components/home-hero";
import { HomeProducts } from "@/components/home-products";
import { HomeRituals } from "@/components/home-rituals";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getHomePage } from "@/server/cms/home";

export default async function HomePage() {
  try {
    const { content, rituals, products } = await getHomePage();

    return (
      <main>
        <HomeHero hero={content.hero} />
        <HomeAbout about={content.about} />
        <HomeRituals
          products={rituals}
          subtitle={content.ritualsPreview.subtitle}
          title={content.ritualsPreview.title}
        />
        <HomeProducts
          products={products}
          subtitle={content.productsPreview.subtitle}
          title={content.productsPreview.title}
        />
      </main>
    );
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;

    return (
      <main className="holding-page">
        <div role="alert">
          <p className="eyebrow">Сервис временно недоступен</p>
          <h1>Главная страница временно недоступна</h1>
          <p>Пожалуйста, попробуйте открыть её немного позже.</p>
        </div>
      </main>
    );
  }
}
