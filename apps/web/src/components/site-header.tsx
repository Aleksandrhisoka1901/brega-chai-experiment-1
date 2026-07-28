"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { getCartQuantity } from "@/features/cart/model";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { cartDrawerStore } from "@/features/cart/components/cart-drawer-store";
import { useCart } from "@/features/cart/use-cart";

type SiteHeaderProps = {
  brandName?: string;
  navigation?: {
    about: string;
    rituals: string;
    products: string;
    cart: string;
  };
};

const defaultNavigation = {
  about: "О проекте",
  rituals: "Ритуалы",
  products: "Сорта",
  cart: "Корзина",
};

export function SiteHeader({
  brandName = "Brega Chai",
  navigation = defaultNavigation,
}: SiteHeaderProps) {
  const cart = useCart();
  const quantity = getCartQuantity(cart);

  return (
    <>
      <header className="site-header">
        <Link
          className="wordmark"
          href="/"
          aria-label={`${brandName} — главная`}
        >
          {brandName}
        </Link>
        <nav className="primary-nav" aria-label="Основная навигация">
          <Link href="/#about">{navigation.about}</Link>
          <Link href="/#rituals">{navigation.rituals}</Link>
          <Link href="/products">{navigation.products}</Link>
        </nav>
        <button
          className="cart-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-label={`Открыть корзину, товаров: ${quantity}`}
          onClick={(event) => cartDrawerStore.open(event.currentTarget)}
        >
          <ShoppingBag aria-hidden="true" />
          <span>{navigation.cart}</span>
          <span aria-hidden="true">{quantity}</span>
        </button>
      </header>
      <CartDrawer />
    </>
  );
}
