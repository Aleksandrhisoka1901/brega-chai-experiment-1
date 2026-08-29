import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleRelatedItem } from "@/server/cms/article-mapper";

import { CardMedia } from "./card-media";
import styles from "./article-related-items.module.css";

function relatedItemHref(item: ArticleRelatedItem) {
  switch (item.type) {
    case "product":
      return `/stantsii/${item.slug}`;
    case "ritual":
      return `/paneli/${item.slug}`;
    case "article":
      return `/stati/${item.slug}`;
  }
}

function relatedItemLabel(type: ArticleRelatedItem["type"]) {
  switch (type) {
    case "product":
      return "Электростанция";
    case "ritual":
      return "Солнечная панель";
    case "article":
      return "Статья";
  }
}

function RelatedMaterialsGroup({
  items,
  title,
}: {
  items: ArticleRelatedItem[];
  title: string;
}) {
  if (items.length === 0) return null;
  const titleId = `related-${items[0]?.type ?? "materials"}-title`;

  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <h2 id={titleId}>{title}</h2>
      <div className={styles.grid}>
        {items.map((item) => (
          <article className={styles.card} key={`${item.type}-${item.id}`}>
            <Link className={styles.link} href={relatedItemHref(item)}>
              <CardMedia
                alt={item.image?.alt ?? item.name}
                className={styles.media}
                fallback={
                  <div className={styles.placeholder} aria-hidden="true">
                    <span>{BRAND_NAME}</span>
                    <small>{relatedItemLabel(item.type)}</small>
                  </div>
                }
                imageUrl={item.image?.url}
                sizes="(max-width: 767px) 100vw, 50vw"
                sources={item.image?.sources}
              />
              <div className={styles.content}>
                <small className={styles.eyebrow}>
                  {relatedItemLabel(item.type)}
                </small>
                <h3>{bindShortRussianWords(item.name)}</h3>
                <span className={styles.cta}>
                  Перейти <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ArticleRelatedMaterials({
  materials,
}: {
  materials: ArticleRelatedItem[];
}) {
  const articles = materials.filter((item) => item.type === "article");
  const products = materials.filter((item) => item.type !== "article");

  if (articles.length === 0 && products.length === 0) return null;

  return (
    <div className={styles.groups}>
      <RelatedMaterialsGroup items={articles} title="Читайте также" />
      <RelatedMaterialsGroup items={products} title="Можете приобрести товар" />
    </div>
  );
}
