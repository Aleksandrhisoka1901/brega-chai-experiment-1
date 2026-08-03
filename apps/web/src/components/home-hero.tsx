import type { HomePageContent } from "@/server/cms/home-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import { ResponsiveImage } from "./responsive-image";
import styles from "./home.module.css";

export function HomeHero({ hero }: { hero: HomePageContent["hero"] }) {
  return (
    <section className={styles.hero} data-layout={hero.layout}>
      <div
        className={styles.heroCopy}
        style={{
          backgroundColor: hero.backgroundColor,
          color: hero.textColor,
        }}
      >
        <p className={styles.chapter}>{bindShortRussianWords(hero.eyebrow)}</p>
        <h1>{bindShortRussianWords(hero.title)}</h1>
        <div className={styles.heroIntro}>
          <p>{bindShortRussianWords(hero.text)}</p>
          {hero.cta ? (
            <EditorialLink
              direction="down"
              href={hero.cta.url}
              label={hero.cta.label}
            />
          ) : null}
        </div>
      </div>
      {hero.layout !== "100/0" ? (
        <div className={styles.heroMedia}>
          {hero.image ? (
            <ResponsiveImage
              alt={hero.image.alt}
              fill
              height={hero.image.height}
              priority
              sizes="(max-width: 767px) 100vw, 60vw"
              sources={hero.image.sources}
              src={hero.image.url}
              width={hero.image.width}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
