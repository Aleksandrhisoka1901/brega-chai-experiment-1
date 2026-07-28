import "server-only";

import type { ProductSummary } from "@brega-chai/contracts";

import { fetchCms } from "./client";
import { mapHomePagePayload, type HomePageContent } from "./home-mapper";
import { mapProductsPayload } from "./product-mapper";

const productFields = new URLSearchParams({
  status: "published",
  "filters[active][$eq]": "true",
  "sort[0]": "sortOrder:asc",
  "fields[0]": "title",
  "fields[1]": "slug",
  "fields[2]": "type",
  "fields[3]": "packageLabel",
  "fields[4]": "price",
  "fields[5]": "stock",
  "fields[6]": "cardExcerpt",
  "populate[mainImage][populate][image][fields][0]": "url",
  "populate[mainImage][populate][image][fields][1]": "alternativeText",
});

export type HomePageData = {
  content: HomePageContent;
  rituals: ProductSummary[];
  products: ProductSummary[];
};

export async function getHomePage(): Promise<HomePageData> {
  const homeQuery = new URLSearchParams({
    status: "published",
    "populate[hero][populate][image][populate][image][fields][0]": "url",
    "populate[hero][populate][image][populate][image][fields][1]": "width",
    "populate[hero][populate][image][populate][image][fields][2]": "height",
    "populate[hero][populate][cta]": "true",
    "populate[about][populate][image][populate][image][fields][0]": "url",
    "populate[about][populate][image][populate][image][fields][1]": "width",
    "populate[about][populate][image][populate][image][fields][2]": "height",
    "populate[ritualsPreview]": "true",
    "populate[productsPreview]": "true",
  });
  const ritualsQuery = new URLSearchParams(productFields);
  ritualsQuery.set("filters[type][$eq]", "ritual");
  ritualsQuery.set("pagination[pageSize]", "100");
  const productsQuery = new URLSearchParams(productFields);
  productsQuery.set("filters[type][$eq]", "product");
  productsQuery.set("pagination[pageSize]", "4");

  const [homePayload, ritualsPayload, productsPayload] = await Promise.all([
    fetchCms(`/api/home-page?${homeQuery}`, { tags: ["home"] }),
    fetchCms(`/api/products?${ritualsQuery}`, { tags: ["products"] }),
    fetchCms(`/api/products?${productsQuery}`, { tags: ["products"] }),
  ]);
  const publicBase =
    process.env.NEXT_PUBLIC_MEDIA_URL ??
    process.env.NEXT_PUBLIC_CMS_URL ??
    "http://localhost:1337";

  return {
    content: mapHomePagePayload(homePayload, publicBase),
    rituals: mapProductsPayload(ritualsPayload, publicBase),
    products: mapProductsPayload(productsPayload, publicBase).slice(0, 4),
  };
}
