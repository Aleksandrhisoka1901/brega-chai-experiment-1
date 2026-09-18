import type { Metadata } from "next";

import { BRAND_NAME } from "@/lib/brand";
import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
} from "@/lib/seo/structured-data";
import { CAPABILITY_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";
import type { CapabilityPageContent } from "@/server/capability-models";

import { Breadcrumbs } from "./breadcrumbs";
import { CapabilityCompare } from "./capability-compare";
import styles from "./capability-page.module.css";
import { JsonLd } from "./json-ld";

export function capabilityPageMetadata(content: CapabilityPageContent): Metadata {
  return pageMetadata({
    title: `${content.title} — ${BRAND_NAME}`,
    description: content.lead,
    path: CAPABILITY_PATH,
  });
}

export function CapabilityStorefrontPage({
  content,
}: {
  content: CapabilityPageContent;
}) {
  const breadcrumbs = [
    { name: "Главная", href: "/" },
    { name: content.title, href: CAPABILITY_PATH },
  ];

  return (
    <main>
      <JsonLd
        data={breadcrumbStructuredData(
          breadcrumbs.map((item) => ({
            name: item.name,
            url: canonicalUrl(item.href),
          })),
        )}
      />
      <JsonLd
        data={collectionPageStructuredData({
          name: content.title,
          description: content.lead,
          url: canonicalUrl(CAPABILITY_PATH),
        })}
      />
      <article className={`${styles.page} content-frame`} data-content-frame>
        <Breadcrumbs items={breadcrumbs} />
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            {content.eyebrow ? (
              <p className={styles.eyebrow}>
                {bindShortRussianWords(content.eyebrow)}
              </p>
            ) : null}
            <h1>{bindShortRussianWords(content.title)}</h1>
          </div>
          <p className={styles.lead}>{bindShortRussianWords(content.lead)}</p>
          {content.note ? (
            <p className={styles.note}>{bindShortRussianWords(content.note)}</p>
          ) : null}
        </header>
        <CapabilityCompare
          models={content.models}
          rows={content.rows}
          tableTitle={content.tableTitle}
        />
      </article>
    </main>
  );
}
