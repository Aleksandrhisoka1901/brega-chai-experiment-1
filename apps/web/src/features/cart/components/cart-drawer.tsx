"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CheckoutSettings } from "../../../server/cms/global-mapper";

import { IconButton } from "../../../components/icon-button";
import { ScrollArea } from "../../../components/scroll-area";
import { bindShortRussianWords } from "../../../lib/typography";
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

const CheckoutPanel = dynamic(
  () =>
    import("../../checkout/checkout-panel").then(
      (module) => module.CheckoutPanel,
    ),
  {
    loading: () => (
      <p className={styles.checkoutLoading} role="status">
        Загрузка формы…
      </p>
    ),
    ssr: false,
  },
);

export function CartDrawer({
  checkoutSettings,
}: {
  checkoutSettings: CheckoutSettings;
}) {
  const cart = useCart();
  const drawer = useCartDrawer();
  const totalQuantity = getCartQuantity(cart);
  const [view, setView] = useState<"cart" | "checkout">("cart");
  const clearCartAfterCloseRef = useRef(false);

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
          data-cart-drawer
          onCloseAutoFocus={(event) => {
            setView("cart");
            if (clearCartAfterCloseRef.current) {
              clearCartAfterCloseRef.current = false;
              cartStore.clear();
            }
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
                {view === "cart" ? "Ваш выбор" : "Новый заказ"}
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
              <IconButton aria-label="Закрыть корзину" size="l">
                <X aria-hidden="true" />
              </IconButton>
            </Dialog.Close>
          </header>

          {view === "checkout" ? (
            <CheckoutPanel
              cart={cart}
              checkoutSettings={checkoutSettings}
              onBack={() => setView("cart")}
              onComplete={cartDrawerStore.close}
              onOrderAccepted={() => {
                clearCartAfterCloseRef.current = true;
              }}
            />
          ) : cart.items.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag aria-hidden="true" />
              <p>{bindShortRussianWords("Здесь пока ничего нет.")}</p>
              <span>
                {bindShortRussianWords(
                  "Начните с готового ритуала или выберите отдельный сорт.",
                )}
              </span>
              <nav aria-label="Перейти к каталогу">
                <Dialog.Close asChild>
                  <Link href="/#nabory">К ритуалам</Link>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <Link href="/tovary">К сортам</Link>
                </Dialog.Close>
              </nav>
            </div>
          ) : (
            <>
              <ScrollArea className={styles.itemsViewport}>
                <ul className={styles.items}>
                  {cart.items.map((item) => {
                    const currentStock =
                      drawer.stockByProductId[item.productId];
                    const availability = getCartItemAvailability(
                      item,
                      currentStock,
                    );
                    const controls = getQuantityControlState(
                      item,
                      currentStock,
                    );

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
                                href={`/${item.type === "nabor" ? "nabory" : "tovary"}/${item.slug}`}
                                onClick={cartDrawerStore.close}
                              >
                                {bindShortRussianWords(item.title)}
                              </Link>
                              <p>{bindShortRussianWords(item.packageLabel)}</p>
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
                              {bindShortRussianWords(
                                availabilityText[availability],
                              )}
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
                              <output aria-live="polite">
                                {item.quantity}
                              </output>
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
                            <IconButton
                              aria-label={`Удалить ${item.title} из корзины`}
                              onClick={() => cartStore.remove(item.productId)}
                            >
                              <Trash2 aria-hidden="true" />
                            </IconButton>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              <footer className={styles.summary}>
                <div>
                  <span>Итого</span>
                  <strong>
                    {priceFormatter.format(getCartSubtotal(cart))}
                  </strong>
                </div>
                <p>
                  {bindShortRussianWords(
                    "Стоимость доставки будет рассчитана после оформления.",
                  )}
                </p>
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
