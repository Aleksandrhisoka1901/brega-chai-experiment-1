import type { ArticleCard as ArticleCardData } from "@/server/cms/article-mapper";

import { ArticleCard } from "./article-card";

export function ArticleGrid({
  articles,
  brandName,
  imagePlaceholder,
}: {
  articles: ArticleCardData[];
  brandName: string;
  imagePlaceholder: string;
}) {
  return (
    <div className="product-grid article-grid">
      {articles.map((article) => (
        <ArticleCard
          article={article}
          brandName={brandName}
          headingLevel={2}
          imagePlaceholder={imagePlaceholder}
          key={article.id}
        />
      ))}
    </div>
  );
}
