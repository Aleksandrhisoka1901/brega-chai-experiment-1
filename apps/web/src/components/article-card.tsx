import Link from "next/link";

import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleCard as ArticleCardData } from "@/server/cms/article-mapper";

import { CardMedia } from "./card-media";

export function ArticleCard({
  brandName,
  headingLevel = 3,
  imagePlaceholder,
  article,
}: {
  brandName: string;
  headingLevel?: 2 | 3;
  imagePlaceholder: string;
  article: ArticleCardData;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card article-card">
      <Link className="product-card__link" href={`/stati/${article.slug}`}>
        <CardMedia
          alt={article.image?.alt ?? article.name}
          className="product-card__media"
          fallback={
            <div className="product-placeholder" aria-hidden="true">
              <span>{bindShortRussianWords(brandName)}</span>
              <small>{bindShortRussianWords(imagePlaceholder)}</small>
            </div>
          }
          imageUrl={article.image?.url}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 368px"
          sources={article.image?.sources}
        />
        <div className="product-card__body">
          <div className="product-card__heading">
            <Heading>{bindShortRussianWords(article.name)}</Heading>
          </div>
        </div>
      </Link>
    </article>
  );
}
