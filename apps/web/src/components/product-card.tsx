import type { ProductSummary } from "@brega-chai/contracts";
import Image from "next/image";
import Link from "next/link";

const priceFormatter = new Intl.NumberFormat("ru-RU");

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/products/${product.slug}`}>
        <div className="product-card__media">
          {product.imageUrl ? (
            <Image
              alt={product.imageAlt ?? ""}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
              src={product.imageUrl}
              unoptimized
            />
          ) : (
            <div className="product-placeholder" aria-hidden="true">
              <span>Brega Chai</span>
              <small>Изображение готовится</small>
            </div>
          )}
        </div>
        <div className="product-card__body">
          <div className="product-card__title-row">
            <h2>{product.title}</h2>
            <p>{priceFormatter.format(product.priceRubles)} ₽</p>
          </div>
          <p className="product-card__excerpt">{product.excerpt}</p>
          <div className="product-card__meta">
            <span>{product.packageLabel}</span>
            <span>{product.inStock ? "В наличии" : "Нет в наличии"}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
