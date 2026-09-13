import type { Metadata } from "next";

import { BRAND_NAME } from "@/lib/brand";
import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
} from "@/lib/seo/structured-data";
import { CAPABILITY_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";
import { CAPABILITY_PAGE } from "@/server/capability-models";

import { Breadcrumbs } from "./breadcrumbs";
import { CapabilityCompare } from "./capability-compare";
import styles from "./capability-page.module.css";
import { JsonLd } from "./json-ld";

export function capabilityPageMetadata(): Metadata {
  return pageMetadata({
    title: `${CAPABILITY_PAGE.title} — ${BRAND_NAME}`,
    description: CAPABILITY_PAGE.lead,
    path: CAPABILITY_PATH,
  });
}

export function CapabilityStorefrontPage() {
  const breadcrumbs = [
    { name: "Главная", href: "/" },
    { name: CAPABILITY_PAGE.title, href: CAPABILITY_PATH },
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
          name: CAPABILITY_PAGE.title,
          description: CAPABILITY_PAGE.lead,
          url: canonicalUrl(CAPABILITY_PATH),
        })}
      />
      <article className={`${styles.page} content-frame`} data-content-frame>
        <Breadcrumbs items={breadcrumbs} />
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <p className={styles.eyebrow}>
              {bindShortRussianWords(CAPABILITY_PAGE.eyebrow)}
            </p>
            <h1>{bindShortRussianWords(CAPABILITY_PAGE.title)}</h1>
          </div>
          <p className={styles.lead}>
            {bindShortRussianWords(CAPABILITY_PAGE.lead)}
          </p>
          <p className={styles.note}>
            {bindShortRussianWords(CAPABILITY_PAGE.note)}
          </p>
        </header>
        <CapabilityCompare />
      </article>
    </main>
  );
}
