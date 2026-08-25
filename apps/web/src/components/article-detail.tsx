import { CardsGrid } from "@/components/blocks/CardsGrid";
import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleDetail as ArticleDetailData } from "@/server/cms/article-mapper";

import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { CardMedia } from "./card-media";
import { SafeHtml } from "./safe-html";
import styles from "./article-detail.module.css";

export function ArticleDetail({
  article,
  breadcrumbs,
  imagePlaceholder,
}: {
  article: ArticleDetailData;
  breadcrumbs: BreadcrumbItem[];
  imagePlaceholder: string;
}) {
  return (
    <article className={`${styles.page} content-frame`} data-content-frame>
      <Breadcrumbs items={breadcrumbs} />
      <header className={styles.header}>
        <h1>{bindShortRussianWords(article.name)}</h1>
      </header>
      {article.image ? (
        <div className={styles.hero}>
          <CardMedia
            alt={article.image.alt}
            className={styles.heroMedia}
            fallback={
              <div className="product-placeholder" aria-hidden="true">
                <small>{bindShortRussianWords(imagePlaceholder)}</small>
              </div>
            }
            imageUrl={article.image.url}
            sizes="(max-width: 767px) 100vw, 960px"
            sources={article.image.sources}
          />
        </div>
      ) : null}
      {article.content ? (
        <SafeHtml className={styles.content} html={article.content} />
      ) : null}
      {article.blocks.map((block, index) => (
        <CardsGrid block={block} key={`${block.title ?? "block"}-${index}`} />
      ))}
    </article>
  );
}
