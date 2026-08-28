import type { ProductSummary } from "@brega-chai/contracts";
import Link from "next/link";

import { catalogItemPath } from "@/lib/catalog-routes";
import { bindShortRussianWords } from "@/lib/typography";

import { CardMedia } from "./card-media";
import { MoneyAmount } from "./money-amount";

export function ProductCard({
  brandName,
  headingLevel = 3,
  imagePlaceholder,
  outOfStock,
  product,
}: {
  brandName: string;
  headingLevel?: 2 | 3;
  imagePlaceholder: string;
  outOfStock: string;
  product: ProductSummary;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card">
      <Link
        className="product-card__link"
        href={catalogItemPath(product.type, product.slug)}
      >
        <CardMedia
          alt={product.imageAlt}
          className="product-card__media"
          fallback={
            <div className="product-placeholder" aria-hidden="true">
              <span>{bindShortRussianWords(brandName)}</span>
              <small>{bindShortRussianWords(imagePlaceholder)}</small>
            </div>
          }
          imageUrl={product.imageUrl}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 368px"
          sources={product.imageSources}
        />
        <div className="product-card__body">
          <div className="product-card__heading">
            <Heading>{bindShortRussianWords(product.title)}</Heading>
            <span>{bindShortRussianWords(product.packageLabel)}</span>
          </div>
          <p className="product-card__excerpt">
            {bindShortRussianWords(product.excerpt)}
          </p>
          <div className="product-card__commerce">
            <strong
              className={
                product.inStock
                  ? "product-card__price"
                  : "product-card__unavailable"
              }
            >
              {product.inStock ? (
                <MoneyAmount rubles={product.priceRubles} variant="card" />
              ) : (
                bindShortRussianWords(outOfStock)
              )}
            </strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
