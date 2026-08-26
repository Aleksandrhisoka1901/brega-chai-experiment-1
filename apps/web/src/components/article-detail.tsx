import { CardsGrid } from "@/components/blocks/CardsGrid";
import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleDetail as ArticleDetailData } from "@/server/cms/article-mapper";

import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import styles from "./article-detail.module.css";

export function ArticleDetail({
  article,
  breadcrumbs,
}: {
  article: ArticleDetailData;
  breadcrumbs: BreadcrumbItem[];
}) {
  return (
    <article className={`${styles.page} content-frame`} data-content-frame>
      <Breadcrumbs items={breadcrumbs} />
      <header className={styles.header}>
        <h1>{bindShortRussianWords(article.name)}</h1>
      </header>
      {article.blocks.map((block, index) => (
        <CardsGrid block={block} key={`${block.title ?? "block"}-${index}`} />
      ))}
    </article>
  );
}
