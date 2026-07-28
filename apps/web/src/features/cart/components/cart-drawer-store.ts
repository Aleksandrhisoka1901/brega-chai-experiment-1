import { useSyncExternalStore } from "react";

type Listener = () => void;

export interface CartDrawerSnapshot {
  open: boolean;
  stockByProductId: Readonly<Record<string, number>>;
}

export interface CartDrawerStore {
  getSnapshot(): CartDrawerSnapshot;
  subscribe(listener: Listener): () => void;
  open(trigger?: HTMLElement): void;
  close(): void;
  setOpen(open: boolean): void;
  registerStock(productId: string, stock: number): void;
  getTrigger(): HTMLElement | undefined;
}

const CLOSED_SNAPSHOT: CartDrawerSnapshot = {
  open: false,
  stockByProductId: {},
};

export function createCartDrawerStore(): CartDrawerStore {
  let snapshot = CLOSED_SNAPSHOT;
  let trigger: HTMLElement | undefined;
  const listeners = new Set<Listener>();

  const publish = (next: CartDrawerSnapshot) => {
    if (next === snapshot) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const setOpen = (open: boolean) => {
    if (snapshot.open === open) return;
    publish({ ...snapshot, open });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(nextTrigger) {
      if (nextTrigger) trigger = nextTrigger;
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    setOpen,
    registerStock(productId, stock) {
      if (snapshot.stockByProductId[productId] === stock) return;
      publish({
        ...snapshot,
        stockByProductId: {
          ...snapshot.stockByProductId,
          [productId]: stock,
        },
      });
    },
    getTrigger: () => trigger,
  };
}

export const cartDrawerStore = createCartDrawerStore();

export function useCartDrawer() {
  return useSyncExternalStore(
    cartDrawerStore.subscribe,
    cartDrawerStore.getSnapshot,
    cartDrawerStore.getSnapshot,
  );
}
