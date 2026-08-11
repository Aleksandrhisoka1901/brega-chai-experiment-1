import type { ProductSummary } from "@brega-chai/contracts";
import type { Ref } from "react";

import { ProductCard } from "./product-card";

export function ProductGrid({
  brandName,
  className,
  headingLevel = 3,
  imagePlaceholder,
  outOfStock,
  products,
  trackRef,
}: {
  brandName: string;
  className?: string;
  headingLevel?: 2 | 3;
  imagePlaceholder: string;
  outOfStock: string;
  products: ProductSummary[];
  trackRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={className ? `product-grid ${className}` : "product-grid"}
      ref={trackRef}
    >
      {products.map((product) => (
        <ProductCard
          brandName={brandName}
          headingLevel={headingLevel}
          imagePlaceholder={imagePlaceholder}
          key={product.id}
          outOfStock={outOfStock}
          product={product}
        />
      ))}
    </div>
  );
}
