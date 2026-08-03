"use client";

import type { ProductSummary } from "@brega-chai/contracts";

import { bindShortRussianWords } from "@/lib/typography";

import { EditorialLink } from "./editorial-link";
import { HomeSliderControls } from "./home-slider-controls";
import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import styles from "./home.module.css";
import { ProductGrid } from "./product-grid";

export function HomeTovary({
  brandName,
  eyebrow,
  imagePlaceholder,
  linkLabel,
  outOfStock,
  products,
  subtitle,
  title,
}: {
  brandName: string;
  eyebrow: string;
  imagePlaceholder: string;
  linkLabel: string;
  outOfStock: string;
  products: ProductSummary[];
  subtitle?: string;
  title: string;
}) {
  const slider = useHorizontalSlider<HTMLDivElement>();

  return (
    <section
      className={`${styles.catalog} ${styles.tovarySection}`}
      id="tovary"
    >
      <header className={styles.sectionHeader}>
        <p className={styles.chapter}>{eyebrow}</p>
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
            subject="сорта"
          />
        ) : null}
      </header>
      <ProductGrid
        brandName={brandName}
        className={styles.homeTovarTrack}
        imagePlaceholder={imagePlaceholder}
        outOfStock={outOfStock}
        products={products}
        trackRef={slider.ref}
      />
      <div className={styles.catalogLink}>
        <EditorialLink href="/tovary" label={linkLabel} />
      </div>
      {slider.canScroll ? (
        <div className={styles.sliderProgress}>
          <SliderProgress progress={slider.progress} />
        </div>
      ) : null}
    </section>
  );
}
