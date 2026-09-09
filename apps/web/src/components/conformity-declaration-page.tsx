import type { Metadata } from "next";
import Link from "next/link";

import { pageMetadata } from "@/lib/seo/metadata";
import { CONFORMITY_PATH } from "@/lib/storefront-routes";
import { bindShortRussianWords } from "@/lib/typography";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getConformityPage } from "@/server/cms/conformity-page";
import {
  FALLBACK_CONFORMITY_PAGE,
  type ConformityPage,
} from "@/server/cms/conformity-page-mapper";
import { getGlobalSettings } from "@/server/cms/global";

import { RichContent } from "./rich-content/rich-content";

async function loadConformityPage(): Promise<ConformityPage> {
  try {
    return (await getConformityPage()) ?? FALLBACK_CONFORMITY_PAGE;
  } catch (error) {
    if (!(error instanceof CmsUnavailableError)) throw error;
    return FALLBACK_CONFORMITY_PAGE;
  }
}

export async function conformityPageMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    loadConformityPage(),
    getGlobalSettings().catch((error: unknown) => {
      if (error instanceof CmsUnavailableError) return null;
      throw error;
    }),
  ]);

  return pageMetadata({
    title:
      page.seo?.title ??
      `${page.title} — ${settings?.brandName ?? "Voltora"}`,
    description:
      page.seo?.description ??
      settings?.defaultSeo.description ??
      page.title,
    imageUrl: page.seo?.imageUrl ?? settings?.defaultSeo.imageUrl,
    path: CONFORMITY_PATH,
  });
}

export async function ConformityDeclarationPage() {
  const page = await loadConformityPage();

  return (
    <main className="legal-page content-frame" data-content-frame>
      {page.eyebrow ? (
        <p className="eyebrow">{bindShortRussianWords(page.eyebrow)}</p>
      ) : null}
      <h1>{bindShortRussianWords(page.title)}</h1>
      <div className="legal-page__body">
        <RichContent content={page.content} />
      </div>
      <p>
        <Link href="/">Вернуться на главную</Link>
      </p>
    </main>
  );
}
