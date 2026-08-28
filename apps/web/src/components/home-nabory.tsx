"use client";

import type { ProductSummary } from "@brega-chai/contracts";
import Link from "next/link";
import type { CSSProperties } from "react";

import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import { HomeSliderControls } from "./home-slider-controls";
import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import { CardMedia } from "./card-media";
import { getHomeCollectionLayout } from "./home-collection-layout";
import styles from "./home.module.css";

export function HomeNabory({
  eyebrow,
  imagePlaceholder,
  linkLabel,
  products,
  subtitle,
  title,
}: {
  eyebrow?: string;
  imagePlaceholder: string;
  linkLabel: string;
  products: ProductSummary[];
  subtitle?: string;
  title: string;
}) {
  const slider = useHorizontalSlider<HTMLDivElement>();
  const layout = getHomeCollectionLayout(products.length);

  if (layout.mode === "hidden") return null;

  return (
    <section className={styles.catalog} id="paneli">
      <div
        className={`${styles.catalogInner} content-frame`}
        data-content-frame
      >
        <header
          className={styles.sectionHeader}
          data-has-eyebrow={Boolean(eyebrow)}
        >
          {eyebrow ? (
            <p className={styles.chapter}>{bindShortRussianWords(eyebrow)}</p>
          ) : null}
          <h2>{bindShortRussianWords(title)}</h2>
          {subtitle ? (
            <p className={styles.sectionDescription}>
              {bindShortRussianWords(subtitle)}
            </p>
          ) : null}
          {slider.canScroll ? (
            <HomeSliderControls
              atEnd={slider.atEnd}
              atStart={slider.atStart}
              onNext={() => slider.scrollItem(1)}
              onPrevious={() => slider.scrollItem(-1)}
              prominent
              subject="панели"
            />
          ) : null}
        </header>
        <div
          className={styles.cardTrack}
          data-card-count={products.length}
          data-collection-layout={layout.mode}
          ref={slider.ref}
          style={
            {
              "--home-card-count": layout.visibleCardCount,
              "--home-track-width": `${layout.visibleCardCount * 25}%`,
            } as CSSProperties
          }
        >
          {products.map((product, index) => (
            <article
              className={styles.naborCard}
              data-home-card="nabor"
              key={product.id}
            >
              <Link
                className={styles.naborCardLink}
                href={`/paneli/${product.slug}`}
              >
                <CardMedia
                  alt={product.imageAlt}
                  className={styles.cardMedia}
                  fallback={
                    <span>{bindShortRussianWords(imagePlaceholder)}</span>
                  }
                  imageUrl={product.imageUrl}
                  sizes="(max-width: 520px) 82vw, (max-width: 1023px) 50vw, 368px"
                  sources={product.imageSources}
                />
                <div className={styles.cardCopy}>
                  <span className={styles.cardNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{bindShortRussianWords(product.title)}</h3>
                  <p>{bindShortRussianWords(product.excerpt)}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
        {slider.canScroll ? (
          <div className={styles.sliderProgress}>
            <SliderProgress progress={slider.progress} />
          </div>
        ) : null}
        <div className={styles.catalogLink}>
          <EditorialLink href="/paneli" label={linkLabel} />
        </div>
      </div>
    </section>
  );
}
