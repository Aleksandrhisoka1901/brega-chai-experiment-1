"use client";

import { useEffect } from "react";

export const YANDEX_METRIKA_COUNTER_ID = 111349846;

const YANDEX_METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";

type YandexMetrika = ((...arguments_: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    __bregaMetrikaInitialized?: boolean;
    ym?: YandexMetrika;
  }
}

const ensureCommandQueue = () => {
  if (window.ym) return window.ym;

  const queue: YandexMetrika = (...arguments_: unknown[]) => {
    (queue.a ??= []).push(arguments_);
  };
  queue.l = Date.now();
  window.ym = queue;

  return queue;
};

const ensureMetrikaScript = () => {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${YANDEX_METRIKA_SCRIPT_URL}"]`,
  );
  if (existingScript) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = YANDEX_METRIKA_SCRIPT_URL;
  script.dataset.bregaMetrika = String(YANDEX_METRIKA_COUNTER_ID);
  document.head.appendChild(script);
};

export function YandexMetrika() {
  useEffect(() => {
    if (window.__bregaMetrikaInitialized) return;

    const ym = ensureCommandQueue();
    window.__bregaMetrikaInitialized = true;
    ym(YANDEX_METRIKA_COUNTER_ID, "init", {
      accurateTrackBounce: true,
      clickmap: true,
      trackLinks: true,
    });
    ensureMetrikaScript();

    return () => {
      window.ym?.(YANDEX_METRIKA_COUNTER_ID, "destruct");
      window.__bregaMetrikaInitialized = false;
    };
  }, []);

  return null;
}
