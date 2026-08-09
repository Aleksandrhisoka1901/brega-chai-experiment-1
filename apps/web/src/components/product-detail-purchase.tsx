"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  cartDrawerStore,
  useCartDrawer,
} from "@/features/cart/components/cart-drawer-store";
import { cartStore, useCart } from "@/features/cart";
import type { CartProduct } from "@/features/cart";
import { bindShortRussianWords } from "@/lib/typography";

import {
  getInitialProductQuantity,
  getMaximumProductQuantity,
  updateProductQuantity,
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
    cartDrawerStore.registerStock(product.productId, product.stock);
  }, [product.productId, product.stock]);
  useEffect(() => {
    setQuantity((current) =>
      maximum === 0 ? 0 : Math.max(1, Math.min(current, maximum)),
    );
  }, [maximum]);
  const inStock = maximum > 0;
  const inCart = cart.items.some(
    (item) => item.productId === product.productId,
  );

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
              disabled={inCart || quantity <= 1}
              onClick={() =>
                setQuantity((current) =>
                  updateProductQuantity(current, -1, maximum),
                )
              }
              type="button"
            >
              <Minus aria-hidden="true" />
            </button>
            <output aria-live="polite" aria-atomic="true">
              {quantity}
            </output>
            <button
              aria-label="Увеличить количество"
              disabled={inCart || quantity >= maximum}
              onClick={() =>
                setQuantity((current) =>
                  updateProductQuantity(current, 1, maximum),
                )
              }
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
