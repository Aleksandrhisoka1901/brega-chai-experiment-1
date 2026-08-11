"use client";

import {
  type ComponentPropsWithoutRef,
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./scroll-area.module.css";

export function ScrollArea({
  bottomShadow = false,
  className,
  onScroll,
  topShadow = false,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  bottomShadow?: boolean;
  topShadow?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    isScrolled: false,
    canScrollDown: false,
  });
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const next = {
      isScrollable: root.scrollHeight > root.clientHeight + 1,
      isScrolled: root.scrollTop > 1,
      canScrollDown: root.scrollHeight - root.scrollTop - root.clientHeight > 1,
    };
    setScrollState((current) =>
      current.isScrollable === next.isScrollable &&
      current.isScrolled === next.isScrolled &&
      current.canScrollDown === next.canScrollDown
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    if (!topShadow && !bottomShadow) return;
    const root = rootRef.current;
    if (!root) return;

    const resizeObserver = new ResizeObserver(measure);
    const observeContents = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(root);
      Array.from(root.children).forEach((child) =>
        resizeObserver.observe(child),
      );
      measure();
    };
    const mutationObserver = new MutationObserver(observeContents);

    observeContents();
    mutationObserver.observe(root, { childList: true });
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bottomShadow, measure, topShadow]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    measure();
    onScroll?.(event);
  };

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-scrollable={
        (topShadow || bottomShadow) && scrollState.isScrollable
          ? "true"
          : undefined
      }
      data-scroll-below={
        bottomShadow && scrollState.isScrollable && scrollState.canScrollDown
          ? "true"
          : undefined
      }
      data-scrolled={
        topShadow && scrollState.isScrollable && scrollState.isScrolled
          ? "true"
          : undefined
      }
      onScroll={handleScroll}
      ref={rootRef}
      {...props}
    />
  );
}
