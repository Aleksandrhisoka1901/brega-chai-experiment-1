"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./navigation-progress.module.css";

const SHOW_DELAY_MS = 180;
const TICK_MS = 180;
const COMPLETE_MS = 320;

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const pathRef = useRef(pathname);
  const shownRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (showRef.current) clearTimeout(showRef.current);
    tickRef.current = null;
    showRef.current = null;
  }, []);

  useEffect(() => {
    if (pathname === pathRef.current) return;
    pathRef.current = pathname;
    clearPending();
    if (hideRef.current) clearTimeout(hideRef.current);

    if (!shownRef.current) {
      setProgress(0);
      setActive(false);
      return;
    }

    setProgress(100);
    hideRef.current = setTimeout(() => {
      shownRef.current = false;
      setActive(false);
      setProgress(0);
    }, COMPLETE_MS);
  }, [clearPending, pathname]);

  useEffect(() => {
    const start = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#")
      ) {
        return;
      }

      const destination = new URL(anchor.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === pathRef.current
      ) {
        return;
      }

      if (hideRef.current) clearTimeout(hideRef.current);
      clearPending();
      shownRef.current = false;
      setProgress(12);
      setActive(false);

      showRef.current = setTimeout(() => {
        shownRef.current = true;
        setActive(true);
      }, SHOW_DELAY_MS);
      tickRef.current = setInterval(() => {
        setProgress((current) =>
          current >= 90 ? current : current + Math.max(1, (90 - current) * 0.1),
        );
      }, TICK_MS);
    };

    document.addEventListener("click", start, true);
    return () => document.removeEventListener("click", start, true);
  }, [clearPending]);

  useEffect(
    () => () => {
      clearPending();
      if (hideRef.current) clearTimeout(hideRef.current);
    },
    [clearPending],
  );

  return (
    <div aria-hidden="true" className={styles.track}>
      <div
        className={styles.indicator}
        data-active={active}
        data-navigation-progress
        style={
          {
            "--navigation-progress": progress / 100,
          } as CSSProperties
        }
      />
    </div>
  );
}
