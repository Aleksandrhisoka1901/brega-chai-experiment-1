import type { Metadata } from "next";
import Link from "next/link";

import { canonicalUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  groupedSitemapEntries,
  HTML_SITEMAP_PATH,
  type SitemapEntry,
} from "@/lib/seo/sitemap";
import {
  breadcrumbStructuredData,
  siteMapStructuredData,
} from "@/lib/seo/structured-data";
import { bindShortRussianWords } from "@/lib/typography";
import { fetchCms } from "@/server/cms/client";
import { loadSitemapEntries } from "@/server/cms/sitemap-entries";

import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";

const PAGE_TITLE = "Карта сайта";
const PAGE_DESCRIPTION =
  "Все публичные страницы каталога, статей и разделов LonEnergy.";

export async function siteMapPageMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: HTML_SITEMAP_PATH,
  });
}

export async function SiteMapPage() {
  const entries = await loadSitemapEntries(fetchCms);
  const groups = groupedSitemapEntries(entries);
  const breadcrumbs = [
    { name: "Главная", href: "/" },
    { name: PAGE_TITLE, href: HTML_SITEMAP_PATH },
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
      <JsonLd data={siteMapStructuredData(entries)} />
      <section
        className="catalog-intro content-frame site-map"
        data-content-frame
        data-has-eyebrow="false"
      >
        <Breadcrumbs items={breadcrumbs} />
        <h1>{bindShortRussianWords(PAGE_TITLE)}</h1>
        <p>{bindShortRussianWords(PAGE_DESCRIPTION)}</p>
        <div className="site-map__groups">
          {groups.map((group) => (
            <SitemapGroupList
              key={group.group}
              title={group.label}
              entries={group.entries}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function SitemapGroupList({
  title,
  entries,
}: {
  title: string;
  entries: SitemapEntry[];
}) {
  return (
    <section className="site-map__group">
      <h2>{bindShortRussianWords(title)}</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.path}>
            <Link href={entry.path}>{bindShortRussianWords(entry.title)}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
