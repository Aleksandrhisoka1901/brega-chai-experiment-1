import type { ArticleCard as ArticleCardData } from "@/server/cms/article-mapper";

import { ArticleCard } from "./article-card";
import styles from "./article-grid.module.css";

export function ArticleGrid({
  articles,
  brandName,
  className,
  headingLevel = 2,
  imagePlaceholder,
}: {
  articles: ArticleCardData[];
  brandName: string;
  className?: string;
  headingLevel?: 2 | 3;
  imagePlaceholder: string;
}) {
  return (
    <div
      className={`${styles.grid} article-grid${className ? ` ${className}` : ""}`}
    >
      {articles.map((article) => (
        <ArticleCard
          article={article}
          brandName={brandName}
          headingLevel={headingLevel}
          imagePlaceholder={imagePlaceholder}
          key={article.id}
        />
      ))}
    </div>
  );
}
