"use client";

import type { ProductSummary } from "@brega-chai/contracts";

import { HomeCollection } from "./home-collection";

export function HomeNabory({
  brandName,
  eyebrow,
  imagePlaceholder,
  linkLabel,
  outOfStock,
  products,
  subtitle,
  title,
}: {
  brandName: string;
  eyebrow?: string;
  imagePlaceholder: string;
  linkLabel: string;
  outOfStock: string;
  products: ProductSummary[];
  subtitle?: string;
  title: string;
}) {
  return (
    <HomeCollection
      brandName={brandName}
      eyebrow={eyebrow}
      href="/paneli"
      id="paneli"
      imagePlaceholder={imagePlaceholder}
      linkLabel={linkLabel}
      outOfStock={outOfStock}
      products={products}
      subject="панели"
      subtitle={subtitle}
      title={title}
    />
  );
}
