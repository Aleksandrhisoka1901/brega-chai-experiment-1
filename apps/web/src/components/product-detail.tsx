import type { ProductDetail as ProductDetailData } from "@/server/cms/product-detail-mapper";
import { bindShortRussianWords } from "@/lib/typography";

import { ProductDetailGallery } from "./product-detail-gallery";
import { ProductDetailPurchase } from "./product-detail-purchase";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { MoneyAmount } from "./money-amount";
import { RichContent } from "./rich-content/rich-content";
import styles from "./product-detail.module.css";
import type { RichContentBlock } from "./rich-content/model";

export function ProductDetail({
  brandName,
  breadcrumbs,
  boutiqueStory,
  imagePlaceholder,
  maxItemQuantity,
  outOfStock,
  product,
}: {
  brandName: string;
  breadcrumbs: BreadcrumbItem[];
  boutiqueStory: RichContentBlock[];
  imagePlaceholder: string;
  maxItemQuantity: number;
  outOfStock: string;
  product: ProductDetailData;
}) {
  return (
    <article className={`${styles.page} content-frame`} data-content-frame>
      <Breadcrumbs items={breadcrumbs} />
      <div className={styles.top}>
        <ProductDetailGallery
          brandName={brandName}
          imagePlaceholder={imagePlaceholder}
          images={product.images}
          title={product.title}
        />

        <div className={styles.commerce}>
          <h1>{bindShortRussianWords(product.title)}</h1>
          <p
            aria-hidden={product.originalTitle ? undefined : true}
            className={styles.originalTitle}
            data-empty={product.originalTitle ? undefined : true}
            data-original-title-slot
          >
            {product.originalTitle
              ? bindShortRussianWords(product.originalTitle)
              : "\u00a0"}
          </p>
          <p className={styles.package}>
            {bindShortRussianWords(product.packageLabel)}
          </p>
          <p className={styles.price}>
            <MoneyAmount rubles={product.priceRubles} variant="detail" />
          </p>

          <ProductDetailPurchase
            maxItemQuantity={maxItemQuantity}
            outOfStock={outOfStock}
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
            <div className={styles.boutiqueStory}>
              <RichContent content={boutiqueStory} />
            </div>
            <div
              className={styles.productStory}
              data-rich-content-scope="product-story"
            >
              <RichContent content={product.story} />
            </div>
          </div>
        </div>
      </div>
      {product.articles.map((content, index) => (
        <section
          className={styles.articleContent}
          data-rich-content-scope="article"
          key={index}
        >
          <RichContent content={content} />
        </section>
      ))}
    </article>
  );
}
