"use client";

import type { ProductSummary } from "@brega-chai/contracts";
import Link from "next/link";

import { bindShortRussianWords } from "@/lib/typography";

import { HomeSliderControls } from "./home-slider-controls";
import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import { CardMedia } from "./card-media";
import styles from "./home.module.css";

export function HomeNabory({
  eyebrow,
  imagePlaceholder,
  products,
  subtitle,
  title,
}: {
  eyebrow: string;
  imagePlaceholder: string;
  products: ProductSummary[];
  subtitle?: string;
  title: string;
}) {
  const slider = useHorizontalSlider<HTMLDivElement>();

  return (
    <section className={styles.catalog} id="nabory">
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
            subject="ритуалы"
          />
        ) : null}
      </header>
      <div className={styles.cardTrack} ref={slider.ref}>
        {products.map((product, index) => (
          <Link
            className={styles.naborCard}
            data-home-card="nabor"
            href={`/nabory/${product.slug}`}
            key={product.id}
          >
            <CardMedia
              alt={product.imageAlt}
              className={styles.cardMedia}
              fallback={<span>{imagePlaceholder}</span>}
              imageUrl={product.imageUrl}
              sizes="(max-width: 767px) 80vw, 25vw"
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
        ))}
      </div>
      {slider.canScroll ? (
        <div className={styles.sliderProgress}>
          <SliderProgress progress={slider.progress} />
        </div>
      ) : null}
    </section>
  );
}
