import type { CSSProperties } from "react";

import type { HomePageContent } from "@/server/cms/home-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import { HERO_LAYOUT_CONFIG } from "./home-hero-layout";
import { ResponsiveImage } from "./responsive-image";
import styles from "./home.module.css";

export function HomeHero({ hero }: { hero: HomePageContent["hero"] }) {
  const layout = HERO_LAYOUT_CONFIG[hero.layout];

  return (
    <section
      className={styles.hero}
      data-layout={hero.layout}
      style={
        {
          "--hero-copy-background": hero.backgroundColor,
        } as CSSProperties
      }
    >
      <div className={`${styles.heroInner} content-frame`} data-content-frame>
        <div
          className={styles.heroCopy}
          data-has-eyebrow={Boolean(hero.eyebrow)}
          style={{
            color: hero.textColor,
          }}
        >
          {hero.eyebrow ? (
            <p className={styles.chapter}>
              {bindShortRussianWords(hero.eyebrow)}
            </p>
          ) : null}
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
        {layout.hasMedia ? (
          <div className={styles.heroMedia}>
            {hero.image ? (
              <ResponsiveImage
                alt={hero.image.alt}
                className={styles.heroImage}
                height={hero.image.height}
                priority
                sizes={layout.imageSizes}
                sources={hero.image.sources}
                src={hero.image.url}
                width={hero.image.width}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
