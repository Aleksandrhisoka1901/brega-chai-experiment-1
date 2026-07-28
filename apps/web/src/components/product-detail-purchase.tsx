"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { cartDrawerStore } from "@/features/cart/components/cart-drawer-store";
import { cartStore, useCart } from "@/features/cart";
import type { CartProduct } from "@/features/cart";

import {
  getInitialProductQuantity,
  getMaximumProductQuantity,
  updateProductQuantity,
} from "./product-detail-model";
import styles from "./product-detail.module.css";

export function ProductDetailPurchase({ product }: { product: CartProduct }) {
  const cart = useCart();
  const maximum = getMaximumProductQuantity(product.stock);
  const [quantity, setQuantity] = useState(() =>
    getInitialProductQuantity(product.stock),
  );
  const [cartReady, setCartReady] = useState(false);
  useEffect(() => setCartReady(true), []);
  const inStock = maximum > 0;
  const inCart = cart.items.some(
    (item) => item.productId === product.productId,
  );

  return (
    <div className={styles.purchase}>
      <p className={styles.availability}>
        {inStock ? "В наличии" : "Нет в наличии"}
      </p>

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
            cartStore.add(product, quantity);
            cartDrawerStore.registerStock(product.productId, product.stock);
          }
          cartDrawerStore.open(event.currentTarget);
        }}
        type="button"
      >
        {!inStock
          ? "Нет в наличии"
          : inCart
            ? "В корзине"
            : "Добавить в корзину"}
      </button>
    </div>
  );
}
