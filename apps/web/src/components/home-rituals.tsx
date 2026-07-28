"use client";

import type { ProductSummary } from "@brega-chai/contracts";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";

import { getCarouselControls, moveCarouselPage } from "./home-carousel-model";
import styles from "./home.module.css";

export function HomeRituals({
  products,
  title,
  subtitle,
}: {
  products: ProductSummary[];
  title: string;
  subtitle?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const controls = getCarouselControls(products.length, page);

  function move(delta: -1 | 1) {
    setPage((current) => moveCarouselPage(current, delta, products.length));
    track.current?.scrollBy({
      left: delta * track.current.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <section className={styles.catalog} id="rituals">
      <header className={styles.sectionHeader}>
        <p>02</p>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {controls.visible ? (
          <div className={styles.controls}>
            <button
              aria-label="Предыдущие ритуалы"
              disabled={controls.previousDisabled}
              onClick={() => move(-1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Следующие ритуалы"
              disabled={controls.nextDisabled}
              onClick={() => move(1)}
              type="button"
            >
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>
      <div className={styles.ritualTrack} ref={track}>
        {products.map((product) => (
          <Link
            className={styles.ritualCard}
            href={`/rituals/${product.slug}`}
            key={product.id}
          >
            <div className={styles.cardMedia}>
              {product.imageUrl ? (
                <Image
                  alt={product.imageAlt ?? ""}
                  fill
                  sizes="(max-width: 767px) 80vw, 25vw"
                  src={product.imageUrl}
                  unoptimized
                />
              ) : (
                <span>Изображение готовится</span>
              )}
            </div>
            <h3>{product.title}</h3>
            <p>{product.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
