"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { YANDEX_METRIKA_COUNTER_ID } from "./goals";

export {
  METRIKA_GOALS,
  reachMetrikaGoal,
  YANDEX_METRIKA_COUNTER_ID,
  YANDEX_METRIKA_SCRIPT_URL,
  YANDEX_METRIKA_WATCH_URL,
} from "./goals";

type YandexMetrikaFn = ((...arguments_: unknown[]) => void) & {
  a?: unknown[][];
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    ym?: YandexMetrikaFn;
  }
}

export function YandexMetrika() {
  const pathname = usePathname();
  const skipNextHit = useRef(true);

  useEffect(() => {
    if (skipNextHit.current) {
      skipNextHit.current = false;
      return;
    }

    window.ym?.(YANDEX_METRIKA_COUNTER_ID, "hit", location.href);
  }, [pathname]);

  return null;
}
