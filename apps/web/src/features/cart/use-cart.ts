"use client";

import { useEffect, useSyncExternalStore } from "react";

import { createCartStore } from "./store";

export const cartStore = createCartStore();

export function useCart() {
  useEffect(() => {
    cartStore.hydrate();
  }, []);

  return useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
}
