"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import styles from "./horizontal-slider.module.css";

type SliderState = {
  canScroll: boolean;
  atStart: boolean;
  atEnd: boolean;
  progress: number;
};

const initialState: SliderState = {
  canScroll: false,
  atStart: true,
  atEnd: true,
  progress: 0,
};

export function useHorizontalSlider<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState(initialState);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
    const position = Math.min(maximum, Math.max(0, element.scrollLeft));
    setState({
      canScroll: maximum > 1,
      atStart: position <= 1,
      atEnd: maximum - position <= 1,
      progress: maximum > 0 ? position / maximum : 0,
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const scrollPage = useCallback((direction: -1 | 1) => {
    const element = ref.current;
    element?.scrollBy({
      left: direction * element.clientWidth,
      behavior: "smooth",
    });
  }, []);

  const scrollItem = useCallback((direction: -1 | 1) => {
    const element = ref.current;
    const item = element?.firstElementChild;
    if (!element || !item) return;
    const styles = getComputedStyle(element);
    const gap = Number.parseFloat(styles.columnGap) || 0;
    element.scrollBy({
      left: direction * (item.getBoundingClientRect().width + gap),
      behavior: "smooth",
    });
  }, []);

  return { ref, scrollItem, scrollPage, ...state };
}

export function SliderProgress({ progress }: { progress: number }) {
  return (
    <div
      aria-hidden="true"
      className={styles.progress}
      data-slider-progress
      style={
        {
          "--slider-progress": Math.min(1, Math.max(0, progress)),
        } as CSSProperties
      }
    >
      <span />
    </div>
  );
}
