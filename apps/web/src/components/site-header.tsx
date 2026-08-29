"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Mail, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { getCartQuantity } from "@/features/cart/model";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { cartDrawerStore } from "@/features/cart/components/cart-drawer-store";
import { useCart } from "@/features/cart/use-cart";
import { BRAND_EMAIL, BRAND_NAME, BRAND_TELEGRAM_URL } from "@/lib/brand";
import { bindShortRussianWords } from "@/lib/typography";
import type { CheckoutSettings } from "@/server/cms/global-mapper";

import { IconButton } from "./icon-button";
import { SiteWordmark } from "./site-wordmark";
import { TelegramMark } from "./telegram-mark";
import styles from "./mobile-menu.module.css";

type SiteHeaderProps = {
  brandName?: string;
  logo?: {
    url: string;
    width: number;
    height: number;
    sources: Array<{ url: string; width: number }>;
  };
  navigation?: {
    about: string;
    nabory: string;
    tovary: string;
    stati: string;
    cart: string;
  };
  contacts?: {
    email: string;
    telegramUrl: string;
  };
  checkoutSettings?: CheckoutSettings;
};

const defaultNavigation = {
  about: "О компании",
  nabory: "Солнечные панели",
  tovary: "Электростанции",
  stati: "Статьи",
  cart: "Корзина",
};

const defaultCheckoutSettings: CheckoutSettings = {
  maxItemQuantity: 5,
  pickupAddress:
    "Самовывоз осуществляется по адресу: г. Москва, проезд Серебрякова, д. 14, стр. 6.",
  pickupDiscountPercent: null,
  courierDeliveryNote: "Стоимость рассчитывается в день отправки, до 1000 руб.",
};

const defaultContacts = {
  email: BRAND_EMAIL,
  telegramUrl: BRAND_TELEGRAM_URL,
};

export function SiteHeader({
  brandName = BRAND_NAME,
  logo,
  navigation = defaultNavigation,
  contacts = defaultContacts,
  checkoutSettings = defaultCheckoutSettings,
}: SiteHeaderProps) {
  const cart = useCart();
  const quantity = getCartQuantity(cart);
  const pathname = usePathname();
  const cartTriggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/#about", label: navigation.about },
    { href: "/stantsii", label: navigation.tovary },
    { href: "/paneli", label: navigation.nabory },
    { href: "/stati", label: navigation.stati },
  ];

  return (
    <>
      <header className="site-header">
        <div className="site-header__content content-frame" data-content-frame>
          <Link
            className="wordmark"
            href="/"
            aria-label={`${brandName} — главная`}
          >
            <SiteWordmark brandName={brandName} logo={logo} />
          </Link>
          <nav className="primary-nav" aria-label="Основная навигация">
            {links.map((link) => (
              <Link href={link.href} key={link.href}>
                {bindShortRussianWords(link.label)}
              </Link>
            ))}
          </nav>
          <button
            className="cart-trigger"
            ref={cartTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Открыть корзину, товаров: ${quantity}`}
            onClick={(event) => cartDrawerStore.open(event.currentTarget)}
          >
            <span>{bindShortRussianWords(navigation.cart)}</span>
            <span aria-hidden="true">·</span>
            <span aria-hidden="true">{quantity}</span>
          </button>
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <IconButton
                aria-label="Открыть меню"
                className={styles.trigger}
                data-mobile-menu-trigger
                size="m"
              >
                <Menu aria-hidden="true" />
              </IconButton>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.overlay} />
              <Dialog.Content
                aria-describedby={undefined}
                aria-label="Меню"
                className={styles.panel}
                data-mobile-menu
              >
                <VisuallyHidden.Root asChild>
                  <Dialog.Title>Меню</Dialog.Title>
                </VisuallyHidden.Root>
                <header className={styles.header}>
                  <span className={styles.brand}>
                    {bindShortRussianWords(brandName)}
                  </span>
                  <Dialog.Close asChild>
                    <IconButton aria-label="Закрыть меню" size="l">
                      <X aria-hidden="true" />
                    </IconButton>
                  </Dialog.Close>
                </header>
                <nav aria-label="Мобильная навигация" className={styles.nav}>
                  <ul>
                    {links.map((link) => {
                      const isCurrent =
                        (link.href === "/stantsii" &&
                          pathname.startsWith("/stantsii")) ||
                        (link.href === "/paneli" &&
                          pathname.startsWith("/paneli")) ||
                        (link.href === "/stati" &&
                          pathname.startsWith("/stati"));

                      return (
                        <li key={link.href}>
                          <Dialog.Close asChild>
                            <Link
                              href={link.href}
                              {...(isCurrent
                                ? { "aria-current": "page" as const }
                                : {})}
                            >
                              {bindShortRussianWords(link.label)}
                            </Link>
                          </Dialog.Close>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <footer className={styles.footer}>
                  <div className={styles.contacts}>
                    <a href={`mailto:${contacts.email}`}>
                      <Mail aria-hidden="true" />
                      <span>{contacts.email}</span>
                    </a>
                    <a
                      href={contacts.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TelegramMark />
                      <span>Telegram</span>
                    </a>
                  </div>
                  <button
                    className={styles.cart}
                    onClick={() => {
                      setMenuOpen(false);
                      window.setTimeout(() => {
                        if (cartTriggerRef.current) {
                          cartDrawerStore.open(cartTriggerRef.current);
                        }
                      }, 0);
                    }}
                    type="button"
                  >
                    {bindShortRussianWords(navigation.cart)} · {quantity}
                  </button>
                </footer>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>
      <CartDrawer checkoutSettings={checkoutSettings} />
    </>
  );
}
