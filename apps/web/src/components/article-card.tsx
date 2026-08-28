import Link from "next/link";

import { safeHtmlToText } from "@/lib/html/safe-html";
import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleCard as ArticleCardData } from "@/server/cms/article-mapper";

import { CardMedia } from "./card-media";
import styles from "./article-card.module.css";

const ARTICLE_CARD_SUMMARY_LIMIT = 160;

function articleSummary(content?: string) {
  if (!content) return undefined;
  const text = safeHtmlToText(content).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= ARTICLE_CARD_SUMMARY_LIMIT) return text;
  return `${text.slice(0, ARTICLE_CARD_SUMMARY_LIMIT - 1).replace(/\s+\S*$/, "")}…`;
}

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
  const summary = articleSummary(article.content);

  return (
    <article className={styles.card}>
      <Link className={styles.link} href={`/stati/${article.slug}`}>
        <div className={styles.media}>
          <CardMedia
            alt={article.image?.alt ?? article.name}
            className={styles.mediaInner}
            fallback={
              <div className="product-placeholder" aria-hidden="true">
                <span>{bindShortRussianWords(brandName)}</span>
                <small>{bindShortRussianWords(imagePlaceholder)}</small>
              </div>
            }
            imageUrl={article.image?.url}
            sizes="(max-width: 767px) 100vw, 40vw"
            sources={article.image?.sources}
          />
        </div>
        <div className={styles.content}>
          <Heading>{bindShortRussianWords(article.name)}</Heading>
          {summary ? <p>{bindShortRussianWords(summary)}</p> : null}
        </div>
      </Link>
    </article>
  );
}
