"use client";

import type { ProductSummary } from "@brega-chai/contracts";
import type { CSSProperties } from "react";

import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import { HomeSliderControls } from "./home-slider-controls";
import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import { getHomeCollectionLayout } from "./home-collection-layout";
import { ProductGrid } from "./product-grid";
import styles from "./home.module.css";

export function HomeCollection({
  brandName,
  eyebrow,
  href,
  id,
  imagePlaceholder,
  linkLabel,
  outOfStock,
  products,
  subject,
  subtitle,
  title,
}: {
  brandName: string;
  eyebrow?: string;
  href: string;
  id: string;
  imagePlaceholder: string;
  linkLabel: string;
  outOfStock: string;
  products: ProductSummary[];
  subject: string;
  subtitle?: string;
  title: string;
}) {
  const slider = useHorizontalSlider<HTMLDivElement>();
  const layout = getHomeCollectionLayout(products.length);

  if (layout.mode === "hidden") return null;

  return (
    <section className={styles.catalog} id={id}>
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
              subject={subject}
            />
          ) : null}
        </header>
        <ProductGrid
          brandName={brandName}
          className={styles.homeCollectionTrack}
          dataCardCount={products.length}
          dataCollectionLayout={layout.mode}
          headingLevel={3}
          imagePlaceholder={imagePlaceholder}
          outOfStock={outOfStock}
          products={products}
          style={
            {
              "--home-card-count": layout.visibleCardCount,
              "--home-track-width": `${layout.visibleCardCount * 25}%`,
            } as CSSProperties
          }
          trackRef={slider.ref}
        />
        {slider.canScroll ? (
          <div className={styles.sliderProgress}>
            <SliderProgress progress={slider.progress} />
          </div>
        ) : null}
        <div className={styles.catalogLink}>
          <EditorialLink href={href} label={linkLabel} />
        </div>
      </div>
    </section>
  );
}
