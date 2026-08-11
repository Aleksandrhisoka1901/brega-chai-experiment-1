import "server-only";

import type { ProductSummary } from "@brega-chai/contracts";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  mapHomeCollectionsPayload,
  mapHomePagePayload,
  type HomePageContent,
} from "./home-mapper";

export type HomePageData = {
  content: HomePageContent;
  nabory: ProductSummary[];
  tovary: ProductSummary[];
};

export async function getHomePage(): Promise<HomePageData> {
  const homeQuery = new URLSearchParams({
    status: "published",
    "populate[seo][fields][0]": "title",
    "populate[seo][fields][1]": "description",
    "populate[seo][populate][image][fields][0]": "url",
    "populate[hero][populate][image][populate][image][fields][0]": "url",
    "populate[hero][populate][image][populate][image][fields][1]": "width",
    "populate[hero][populate][image][populate][image][fields][2]": "height",
    "populate[hero][populate][image][populate][image][fields][3]": "formats",
    "populate[hero][populate][cta]": "true",
    "populate[about]": "true",
    "populate[naboryPreview]": "true",
    "populate[tovaryPreview]": "true",
  });
  for (const [relation, type] of [
    ["featuredNabory", "nabor"],
    ["featuredTovary", "tovar"],
  ] as const) {
    homeQuery.set(`populate[${relation}][filters][type][$eq]`, type);
    homeQuery.set(
      `populate[${relation}][filters][publishedAt][$notNull]`,
      "true",
    );
    for (const [index, field] of [
      "displayName",
      "slug",
      "type",
      "packageLabel",
      "price",
      "stock",
      "cardExcerpt",
    ].entries()) {
      homeQuery.set(`populate[${relation}][fields][${index}]`, field);
    }
    for (const [index, field] of [
      "url",
      "alternativeText",
      "formats",
      "width",
      "height",
    ].entries()) {
      homeQuery.set(
        `populate[${relation}][populate][mainImage][populate][image][fields][${index}]`,
        field,
      );
    }
  }

  const homePayload = await fetchCms(`/api/home-page?${homeQuery}`, {
    tags: ["home", "products"],
  });
  const publicBase = publicMediaOrigin();
  const collections = mapHomeCollectionsPayload(homePayload, publicBase);

  return {
    content: mapHomePagePayload(homePayload, publicBase),
    ...collections,
  };
}
