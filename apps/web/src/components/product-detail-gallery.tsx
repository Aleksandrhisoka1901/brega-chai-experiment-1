"use client";

import {
  useEffect,
  useReducer,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from "react";

import type { ProductDetailImage } from "@/server/cms/product-detail-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { SliderProgress, useHorizontalSlider } from "./horizontal-slider";
import {
  activeGalleryIndex,
  galleryTransitionReducer,
  initialGalleryTransitionState,
  renderedGalleryIndexes,
} from "./product-gallery-transition";
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
  const [transition, dispatchTransition] = useReducer(
    galleryTransitionReducer,
    initialGalleryTransitionState,
  );
  const swipeOriginRef = useRef<SwipeOrigin | null>(null);
  const slider = useHorizontalSlider<HTMLDivElement>();
  const selectedImage = images[transition.selectedIndex];
  const activeIndex = activeGalleryIndex(transition);
  const renderedIndexes = renderedGalleryIndexes(transition);

  useEffect(() => {
    if (transition.phase !== "ready" || transition.pendingIndex === null) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dispatchTransition({
        type: "finish-fade",
        index: transition.pendingIndex,
      });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      dispatchTransition({ type: "start-fade" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [transition.pendingIndex, transition.phase]);

  useEffect(() => {
    if (transition.phase !== "fading" || transition.pendingIndex === null) {
      return;
    }
    const pendingIndex = transition.pendingIndex;
    const fallback = window.setTimeout(() => {
      dispatchTransition({ type: "finish-fade", index: pendingIndex });
    }, 450);
    return () => window.clearTimeout(fallback);
  }, [transition.pendingIndex, transition.phase]);

  const selectImage = (index: number) => {
    dispatchTransition({ type: "select", index });
  };

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

    selectImage(
      Math.max(0, Math.min(images.length - 1, transition.selectedIndex + step)),
    );
  };

  const handleImageTransitionEnd = (
    event: ReactTransitionEvent<HTMLImageElement>,
    index: number,
  ) => {
    if (event.propertyName !== "opacity" || index !== transition.pendingIndex) {
      return;
    }
    dispatchTransition({ type: "finish-fade", index });
  };

  if (!selectedImage) {
    return (
      <div className={styles.placeholder} aria-label={`Изображение ${title}`}>
        <span>{bindShortRussianWords(brandName)}</span>
        <small>{bindShortRussianWords(imagePlaceholder)}</small>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div
        aria-label="Изображения товара"
        className={styles.thumbnailArea}
        role="group"
      >
        <div className={styles.thumbnails} ref={slider.ref}>
          {images.map((image, index) => (
            <button
              aria-label={`Показать изображение ${index + 1}`}
              aria-pressed={transition.selectedIndex === index}
              className={styles.thumbnail}
              key={`${image.url}-${index}`}
              onClick={() => selectImage(index)}
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

      <div
        aria-label="Главное изображение товара"
        aria-busy={
          transition.phase === "loading" || transition.phase === "ready"
        }
        className={styles.mainImage}
        onPointerCancel={() => {
          swipeOriginRef.current = null;
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        role="group"
      >
        {renderedIndexes.map((index) => {
          const image = images[index];
          if (!image) return null;
          const isActive = index === activeIndex;

          return (
            <ResponsiveImage
              aria-hidden={!isActive}
              className={styles.mainImageTransition}
              data-active={isActive}
              alt={isActive ? image.alt : ""}
              height={image.height}
              key={`${image.url}-${index}`}
              onLoad={() => dispatchTransition({ type: "load", index })}
              onTransitionEnd={(event) =>
                handleImageTransitionEnd(event, index)
              }
              priority={index === 0}
              sizes="(max-width: 520px) 100vw, (max-width: 767px) calc(100vw - 2.5rem), (max-width: 1023px) calc(100vw - 8rem), 680px"
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
