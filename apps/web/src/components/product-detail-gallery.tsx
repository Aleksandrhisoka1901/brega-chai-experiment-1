"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { ProductDetailImage } from "@/server/cms/product-detail-mapper";

import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import { getGallerySwipeStep } from "./product-gallery-swipe";
import { ResponsiveImage } from "./responsive-image";
import styles from "./product-detail.module.css";

type SwipeOrigin = {
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
};

export function ProductDetailGallery({
  brandName,
  imagePlaceholder,
  images,
  title,
}: {
  brandName: string;
  imagePlaceholder: string;
  images: ProductDetailImage[];
  title: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const swipeOriginRef = useRef<SwipeOrigin | null>(null);
  const slider = useHorizontalSlider<HTMLDivElement>();
  const selectedImage = images[selectedIndex];

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || images.length < 2) return;

    swipeOriginRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
    };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = swipeOriginRef.current;
    swipeOriginRef.current = null;
    if (!origin || origin.pointerId !== event.pointerId) return;

    const step = getGallerySwipeStep({
      endX: event.clientX,
      endY: event.clientY,
      startX: origin.startX,
      startY: origin.startY,
      width: origin.width,
    });
    if (step === 0) return;

    setSelectedIndex((currentIndex) =>
      Math.max(0, Math.min(images.length - 1, currentIndex + step)),
    );
  };

  if (!selectedImage) {
    return (
      <div className={styles.placeholder} aria-label={`Изображение ${title}`}>
        <span>{brandName}</span>
        <small>{imagePlaceholder}</small>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {images.length > 1 ? (
        <div
          aria-label="Изображения товара"
          className={styles.thumbnailArea}
          role="group"
        >
          <div className={styles.thumbnails} ref={slider.ref}>
            {images.map((image, index) => (
              <button
                aria-label={`Показать изображение ${index + 1}: ${image.alt}`}
                aria-pressed={selectedIndex === index}
                className={styles.thumbnail}
                key={`${image.url}-${index}`}
                onClick={() => setSelectedIndex(index)}
                type="button"
              >
                <ResponsiveImage
                  alt=""
                  fill
                  height={image.height}
                  sizes="(max-width: 1023px) 72px, 88px"
                  sources={image.sources}
                  src={image.thumbnailUrl}
                  width={image.width}
                />
              </button>
            ))}
          </div>
          {slider.canScroll ? (
            <div className={styles.thumbnailProgress}>
              <SliderProgress progress={slider.progress} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        aria-label="Главное изображение товара"
        className={styles.mainImage}
        onPointerCancel={() => {
          swipeOriginRef.current = null;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        role="group"
      >
        {images.map((image, index) => {
          const isSelected = index === selectedIndex;

          return (
            <ResponsiveImage
              aria-hidden={!isSelected}
              className={styles.mainImageTransition}
              data-active={isSelected}
              alt={isSelected ? image.alt : ""}
              height={image.height}
              key={`${image.url}-${index}`}
              priority={index === 0}
              sizes="(max-width: 767px) 100vw, 52vw"
              sources={image.sources}
              src={image.url}
              width={image.width}
            />
          );
        })}
      </div>
    </div>
  );
}
