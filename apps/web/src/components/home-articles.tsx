import { bindShortRussianWords } from "@/lib/typography";
import type { ArticleCard } from "@/server/cms/article-mapper";

import { ArticleGrid } from "./article-grid";
import { EditorialLink } from "./editorial-link";
import styles from "./home.module.css";

export function HomeArticles({
  articles,
  brandName,
  eyebrow,
  imagePlaceholder,
  linkLabel,
  subtitle,
  title,
}: {
  articles: ArticleCard[];
  brandName: string;
  eyebrow?: string;
  imagePlaceholder: string;
  linkLabel: string;
  subtitle?: string;
  title: string;
}) {
  if (articles.length === 0) return null;

  return (
    <section className={styles.catalog} id="stati">
      <div
        className={`${styles.catalogInner} content-frame`}
        data-content-frame
      >
        <header
          className={styles.sectionHeader}
          data-has-eyebrow={Boolean(eyebrow)}
        >
          {eyebrow ? (
            <p className={styles.chapter}>{bindShortRussianWords(eyebrow)}</p>
          ) : null}
          <h2>{bindShortRussianWords(title)}</h2>
          {subtitle ? (
            <p className={styles.sectionDescription}>
              {bindShortRussianWords(subtitle)}
            </p>
          ) : null}
        </header>
        <ArticleGrid
          articles={articles}
          brandName={brandName}
          className={styles.articlesTrack}
          headingLevel={3}
          imagePlaceholder={imagePlaceholder}
        />
        <div className={styles.catalogLink}>
          <EditorialLink href="/stati" label={linkLabel} />
        </div>
      </div>
    </section>
  );
}
