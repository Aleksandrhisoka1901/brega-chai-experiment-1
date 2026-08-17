"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  cartDrawerStore,
  useCartDrawer,
} from "@/features/cart/components/cart-drawer-store";
import { cartStore, useCart } from "@/features/cart";
import { fetchCartStock } from "@/features/cart/availability-client";
import type { CartProduct } from "@/features/cart";
import { bindShortRussianWords } from "@/lib/typography";

import {
  getInitialProductQuantity,
  getMaximumProductQuantity,
  resolveProductQuantityChange,
} from "./product-detail-model";
import styles from "./product-detail.module.css";

export function ProductDetailPurchase({
  outOfStock,
  product,
}: {
  outOfStock: string;
  product: CartProduct;
}) {
  const cart = useCart();
  const drawer = useCartDrawer();
  const currentStock =
    drawer.stockByProductId[product.productId] ?? product.stock;
  const maximum = getMaximumProductQuantity(currentStock);
  const [quantity, setQuantity] = useState(() =>
    getInitialProductQuantity(product.stock),
  );
  const [cartReady, setCartReady] = useState(false);
  useEffect(() => setCartReady(true), []);
  useEffect(() => {
    const knownStock =
      cartDrawerStore.getSnapshot().stockByProductId[product.productId];
    if (knownStock === undefined) {
      cartDrawerStore.registerStock(product.productId, product.stock);
    }

    let active = true;
    let requestId = 0;
    const refreshLiveStock = async () => {
      const currentRequestId = ++requestId;
      try {
        const stocks = await fetchCartStock([{ productId: product.productId }]);
        if (active && currentRequestId === requestId) {
          cartDrawerStore.registerStocks(stocks);
        }
      } catch {
        // Keep the cached server value as a graceful fallback. Checkout still
        // performs a mandatory no-store stock check before showing the form.
      }
    };
    const handleFocus = () => void refreshLiveStock();

    void refreshLiveStock();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [product.productId, product.stock]);
  useEffect(() => {
    setQuantity((current) =>
      maximum === 0 ? 0 : Math.max(1, Math.min(current, maximum)),
    );
  }, [maximum]);
  const inStock = maximum > 0;
  const cartItem = cart.items.find(
    (item) => item.productId === product.productId,
  );
  const inCart = cartItem !== undefined;
  const displayedQuantity = cartItem?.quantity ?? quantity;

  const changeQuantity = (delta: -1 | 1) => {
    const change = resolveProductQuantityChange({
      selectedQuantity: quantity,
      cartQuantity: cartItem?.quantity,
      delta,
      maximum,
    });

    if (change.target === "cart") {
      cartStore.updateQuantity(
        product.productId,
        change.quantity,
        currentStock,
      );
    } else {
      setQuantity(change.quantity);
    }
  };

  return (
    <div className={styles.purchase}>
      {inStock ? (
        <div className={styles.quantityRow}>
          <span id="product-quantity-label">Количество</span>
          <div
            aria-labelledby="product-quantity-label"
            className={styles.quantity}
            role="group"
          >
            <button
              aria-label="Уменьшить количество"
              disabled={displayedQuantity <= 1}
              onClick={() => changeQuantity(-1)}
              type="button"
            >
              <Minus aria-hidden="true" />
            </button>
            <output aria-live="polite" aria-atomic="true">
              {displayedQuantity}
            </output>
            <button
              aria-label="Увеличить количество"
              disabled={displayedQuantity >= maximum}
              onClick={() => changeQuantity(1)}
              type="button"
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        className={styles.addButton}
        data-cart-ready={cartReady}
        disabled={!inStock}
        onClick={(event) => {
          if (!inCart) {
            cartStore.add({ ...product, stock: currentStock }, quantity);
            cartDrawerStore.registerStock(product.productId, currentStock);
          }
          cartDrawerStore.open(event.currentTarget);
        }}
        type="button"
      >
        {bindShortRussianWords(
          !inStock ? outOfStock : inCart ? "В корзине" : "Добавить в корзину",
        )}
      </button>
    </div>
  );
}
