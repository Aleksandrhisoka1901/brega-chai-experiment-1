"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CheckoutPanel } from "../../checkout/checkout-panel";
import { getCartQuantity, getCartSubtotal } from "../model";
import { cartStore } from "../use-cart";
import { useCart } from "../use-cart";
import {
  getCartItemAvailability,
  getQuantityControlState,
} from "./cart-drawer-model";
import { cartDrawerStore, useCartDrawer } from "./cart-drawer-store";
import styles from "./cart-drawer.module.css";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const availabilityText = {
  insufficient: "Остаток уменьшился. Снизьте количество для оформления.",
  unavailable: "Товар закончился. Удалите позицию вручную.",
} as const;

export function CartDrawer() {
  const cart = useCart();
  const drawer = useCartDrawer();
  const totalQuantity = getCartQuantity(cart);
  const [view, setView] = useState<"cart" | "checkout">("cart");

  return (
    <Dialog.Root
      open={drawer.open}
      onOpenChange={(open) => {
        cartDrawerStore.setOpen(open);
        if (!open) setView("cart");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          aria-describedby={undefined}
          className={styles.drawer}
          onCloseAutoFocus={(event) => {
            const trigger = cartDrawerStore.getTrigger();
            if (trigger) {
              event.preventDefault();
              trigger.focus();
            }
          }}
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>
                {view === "cart" ? "Ваш выбор" : "Заказ-заявка"}
              </p>
              <Dialog.Title className={styles.title}>
                {view === "cart" ? "Корзина" : "Оформление"}
              </Dialog.Title>
            </div>
            {totalQuantity > 0 ? (
              <span
                className={styles.count}
                aria-label={`Товаров: ${totalQuantity}`}
              >
                {totalQuantity}
              </span>
            ) : null}
            <Dialog.Close asChild>
              <button
                aria-label="Закрыть корзину"
                className={styles.close}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          {view === "checkout" ? (
            <CheckoutPanel cart={cart} onBack={() => setView("cart")} />
          ) : cart.items.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag aria-hidden="true" />
              <p>Здесь пока ничего нет.</p>
              <span>
                Начните с готового ритуала или выберите отдельный сорт.
              </span>
              <nav aria-label="Перейти к каталогу">
                <Dialog.Close asChild>
                  <Link href="/#rituals">К ритуалам</Link>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <Link href="/products">К сортам</Link>
                </Dialog.Close>
              </nav>
            </div>
          ) : (
            <>
              <ul className={styles.items}>
                {cart.items.map((item) => {
                  const currentStock = drawer.stockByProductId[item.productId];
                  const availability = getCartItemAvailability(
                    item,
                    currentStock,
                  );
                  const controls = getQuantityControlState(item, currentStock);

                  return (
                    <li className={styles.item} key={item.productId}>
                      <div className={styles.image}>
                        <Image
                          alt={item.image.alt}
                          fill
                          sizes="80px"
                          src={item.image.url}
                          unoptimized
                        />
                      </div>
                      <div className={styles.itemBody}>
                        <div className={styles.namePrice}>
                          <div>
                            <Link
                              href={`/${item.type === "ritual" ? "rituals" : "products"}/${item.slug}`}
                              onClick={cartDrawerStore.close}
                            >
                              {item.title}
                            </Link>
                            <p>{item.packageLabel}</p>
                          </div>
                          <strong>
                            {priceFormatter.format(
                              item.unitPriceSnapshot * item.quantity,
                            )}
                          </strong>
                        </div>

                        {availability === "insufficient" ||
                        availability === "unavailable" ? (
                          <p className={styles.warning} role="status">
                            {availabilityText[availability]}
                          </p>
                        ) : null}

                        <div className={styles.actions}>
                          <div
                            aria-label={`Количество ${item.title}`}
                            className={styles.quantity}
                            role="group"
                          >
                            <button
                              aria-label={`Уменьшить количество ${item.title}`}
                              disabled={!controls.canDecrease}
                              onClick={() =>
                                cartStore.updateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                  currentStock ?? 5,
                                )
                              }
                              type="button"
                            >
                              <Minus aria-hidden="true" />
                            </button>
                            <output aria-live="polite">{item.quantity}</output>
                            <button
                              aria-label={`Увеличить количество ${item.title}`}
                              disabled={!controls.canIncrease}
                              onClick={() =>
                                cartStore.updateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                  currentStock ?? 5,
                                )
                              }
                              type="button"
                            >
                              <Plus aria-hidden="true" />
                            </button>
                          </div>
                          <button
                            className={styles.remove}
                            onClick={() => cartStore.remove(item.productId)}
                            type="button"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <footer className={styles.summary}>
                <div>
                  <span>Итого</span>
                  <strong>
                    {priceFormatter.format(getCartSubtotal(cart))}
                  </strong>
                </div>
                <p>Стоимость доставки будет рассчитана после заявки.</p>
                <button
                  className={styles.checkout}
                  disabled={cart.items.some((item) => {
                    const availability = getCartItemAvailability(
                      item,
                      drawer.stockByProductId[item.productId],
                    );
                    return (
                      availability === "insufficient" ||
                      availability === "unavailable"
                    );
                  })}
                  onClick={() => setView("checkout")}
                  type="button"
                >
                  Перейти к оформлению
                </button>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
