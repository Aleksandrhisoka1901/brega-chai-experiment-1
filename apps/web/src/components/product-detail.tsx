import type { ProductDetail as ProductDetailData } from "@/server/cms/product-detail-mapper";

import { ProductDetailGallery } from "./product-detail-gallery";
import { ProductDetailPurchase } from "./product-detail-purchase";
import styles from "./product-detail.module.css";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function ProductDetail({ product }: { product: ProductDetailData }) {
  return (
    <article className={styles.page}>
      <div className={styles.top}>
        <ProductDetailGallery images={product.images} title={product.title} />

        <div className={styles.commerce}>
          <p className={styles.eyebrow}>
            {product.type === "ritual" ? "Ритуал" : "Сорт"}
          </p>
          <h1>{product.title}</h1>
          {product.originalTitle ? (
            <p className={styles.originalTitle}>{product.originalTitle}</p>
          ) : null}
          <p className={styles.package}>{product.packageLabel}</p>
          <p className={styles.price}>
            {priceFormatter.format(product.priceRubles)}
          </p>

          <ProductDetailPurchase
            product={{
              productId: product.id,
              slug: product.slug,
              type: product.type,
              title: product.title,
              packageLabel: product.packageLabel,
              unitPriceSnapshot: product.priceRubles,
              currency: product.currency,
              image: product.images[0]
                ? {
                    url: product.images[0].url,
                    alt: product.images[0].alt,
                  }
                : {
                    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Cpath fill='%23d7cfbe' d='M0 0h4v5H0z'/%3E%3C/svg%3E",
                    alt: "",
                  },
              stock: product.stock,
            }}
          />

          <div className={styles.copy}>
            <p>{product.excerpt}</p>
            <p>{product.story}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
