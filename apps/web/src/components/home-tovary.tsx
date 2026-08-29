"use client";

import type { ProductSummary } from "@brega-chai/contracts";

import { HomeCollection } from "./home-collection";

export function HomeTovary({
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
      href="/stantsii"
      id="stantsii"
      imagePlaceholder={imagePlaceholder}
      linkLabel={linkLabel}
      outOfStock={outOfStock}
      products={products}
      subject="электростанции"
      subtitle={subtitle}
      title={title}
    />
  );
}
