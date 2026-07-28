import type { ProductSummary } from "@brega-chai/contracts";
import Link from "next/link";

import { ProductCard } from "./product-card";
import styles from "./home.module.css";

export function HomeProducts({
  products,
  title,
  subtitle,
}: {
  products: ProductSummary[];
  title: string;
  subtitle?: string;
}) {
  return (
    <section className={styles.catalog} id="products">
      <header className={styles.sectionHeader}>
        <p>03</p>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <Link href="/products">Смотреть все сорта</Link>
      </header>
      <div className={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
