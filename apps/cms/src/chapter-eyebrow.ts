const CHAPTER_PREFIX = /^глава\s+\d{1,2}\s*(?:[·•.\-—|:]\s*)?/iu;
const BARE_CHAPTER_NUMBER = /^\d{1,2}$/;

type DocumentStatus = "draft" | "published";

type EyebrowComponent = {
  id?: unknown;
  eyebrow?: string | null;
};

type HomeDocument = {
  hero?: EyebrowComponent | null;
  about?: EyebrowComponent | null;
  naboryPreview?: EyebrowComponent | null;
  tovaryPreview?: EyebrowComponent | null;
  articlesPreview?: EyebrowComponent | null;
};

type PageDocument = {
  documentId: string;
  eyebrow?: string | null;
};

export function sanitizeEditorialEyebrow(
  value: string | null | undefined,
): string | undefined {
  let text = value?.trim() ?? "";
  if (!text) return undefined;
  if (CHAPTER_PREFIX.test(text)) {
    text = text.replace(CHAPTER_PREFIX, "").trim();
  }
  if (!text || BARE_CHAPTER_NUMBER.test(text)) return undefined;
  return text;
}

export function chapterEyebrowNeedsUpdate(value?: string | null) {
  const current = value?.trim() || null;
  const next = sanitizeEditorialEyebrow(value) ?? null;
  return current !== next;
}

async function clearComponentEyebrow(
  strapi: any,
  uid: string,
  component?: EyebrowComponent | null,
) {
  if (component?.id == null || !chapterEyebrowNeedsUpdate(component.eyebrow)) {
    return;
  }

  await strapi.db.query(uid).update({
    where: { id: component.id },
    data: { eyebrow: sanitizeEditorialEyebrow(component.eyebrow) ?? null },
  });
}

async function clearPageEyebrows(strapi: any, uid: string) {
  const documents = strapi.documents(uid);

  for (const status of ["draft", "published"] satisfies DocumentStatus[]) {
    const pages = (await documents.findMany({
      status,
    })) as PageDocument[];

    for (const page of pages) {
      if (!chapterEyebrowNeedsUpdate(page.eyebrow)) continue;
      await documents.update({
        documentId: page.documentId,
        status,
        data: { eyebrow: sanitizeEditorialEyebrow(page.eyebrow) ?? null },
      });
    }
  }
}

export async function ensureChapterEyebrowsCleared(strapi: any) {
  const homes = strapi.documents("api::home-page.home-page");

  for (const status of ["draft", "published"] satisfies DocumentStatus[]) {
    const pages = (await homes.findMany({
      status,
      populate: [
        "hero",
        "about",
        "naboryPreview",
        "tovaryPreview",
        "articlesPreview",
      ],
    })) as HomeDocument[];

    for (const home of pages) {
      await clearComponentEyebrow(strapi, "home.hero", home.hero);
      await clearComponentEyebrow(
        strapi,
        "home.editorial-section",
        home.about,
      );
      await clearComponentEyebrow(
        strapi,
        "home.rituals-preview",
        home.naboryPreview,
      );
      await clearComponentEyebrow(
        strapi,
        "home.catalog-preview",
        home.tovaryPreview,
      );
      await clearComponentEyebrow(
        strapi,
        "home.articles-preview",
        home.articlesPreview,
      );
    }
  }

  await clearPageEyebrows(strapi, "api::products-page.products-page");
  await clearPageEyebrows(strapi, "api::rituals-page.rituals-page");
  await clearPageEyebrows(strapi, "api::articles-page.articles-page");
}
