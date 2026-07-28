"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductDetailImage } from "@/server/cms/product-detail-mapper";

import styles from "./product-detail.module.css";

export function ProductDetailGallery({
  images,
  title,
}: {
  images: ProductDetailImage[];
  title: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];

  if (!selectedImage) {
    return (
      <div className={styles.placeholder} aria-label={`Изображение ${title}`}>
        <span>Brega Chai</span>
        <small>Изображение готовится</small>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {images.length > 1 ? (
        <div
          aria-label="Изображения товара"
          className={styles.thumbnails}
          role="group"
        >
          {images.map((image, index) => (
            <button
              aria-label={`Показать изображение ${index + 1}: ${image.alt}`}
              aria-pressed={selectedIndex === index}
              className={styles.thumbnail}
              key={`${image.url}-${index}`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              <Image
                alt=""
                fill
                sizes="(max-width: 767px) 72px, 88px"
                src={image.url}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.mainImage}>
        <Image
          alt={selectedImage.alt}
          height={selectedImage.height}
          key={selectedImage.url}
          priority
          sizes="(max-width: 767px) 100vw, 52vw"
          src={selectedImage.url}
          width={selectedImage.width}
        />
      </div>
    </div>
  );
}
