import type { ProductSummary } from "@brega-chai/contracts";
import type { CSSProperties, Ref } from "react";

import { ProductCard } from "./product-card";

export function ProductGrid({
  brandName,
  className,
  dataCardCount,
  dataCollectionLayout,
  headingLevel = 3,
  imagePlaceholder,
  outOfStock,
  products,
  style,
  trackRef,
}: {
  brandName: string;
  className?: string;
  dataCardCount?: number;
  dataCollectionLayout?: "fixed" | "slider";
  headingLevel?: 2 | 3;
  imagePlaceholder: string;
  outOfStock: string;
  products: ProductSummary[];
  style?: CSSProperties;
  trackRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={className ? `product-grid ${className}` : "product-grid"}
      data-card-count={dataCardCount}
      data-collection-layout={dataCollectionLayout}
      ref={trackRef}
      style={style}
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
