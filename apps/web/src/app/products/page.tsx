import type { ProductSummary } from "@brega-chai/contracts";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getProducts } from "@/server/cms/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let products: ProductSummary[] = [];
  let unavailable = false;

  try {
    products = await getProducts();
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    unavailable = true;
  }

  return (
    <main>
      <section className="catalog-intro">
        <p className="eyebrow">Глава III · Сорта</p>
        <h1>Чай, выбранный для внимания</h1>
        <p>
          Небольшая коллекция без спешки и рейтингов. Каждый сорт — отдельный
          способ услышать воду, лист и собственный ритм.
        </p>
      </section>

      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <h2 id="catalog-title">Все сорта</h2>
          <p>{products.length > 0 ? `${products.length} позиции` : ""}</p>
        </div>

        {unavailable ? (
          <div className="catalog-state" role="alert">
            <p>Каталог временно недоступен.</p>
            <p>Пожалуйста, попробуйте обновить страницу немного позже.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-state">
            <p>Сорта скоро появятся.</p>
            <Link href="/">Вернуться на главную</Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
