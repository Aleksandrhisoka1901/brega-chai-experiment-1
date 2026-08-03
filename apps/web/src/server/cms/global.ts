import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { mapGlobalSettingsPayload, type GlobalSettings } from "./global-mapper";

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "brandName",
    "fields[1]": "email",
    "fields[2]": "telegramUrl",
    "fields[3]": "legalDetails",
    "fields[4]": "defaultProductStory",
    "fields[5]": "pickupAddress",
    "fields[6]": "pickupDiscountPercent",
    "fields[7]": "courierDeliveryNote",
    "populate[navigation]": "true",
    "populate[sectionBreadcrumbs]": "true",
    "populate[storefrontTexts]": "true",
    "populate[logo][fields][0]": "url",
    "populate[logo][fields][1]": "width",
    "populate[logo][fields][2]": "height",
    "populate[logo][fields][3]": "formats",
    "populate[defaultSeo][fields][0]": "title",
    "populate[defaultSeo][fields][1]": "description",
    "populate[defaultSeo][populate][image][fields][0]": "url",
  });
  const payload = await fetchCms(`/api/global-setting?${query}`, {
    tags: ["global"],
  });

  return mapGlobalSettingsPayload(payload, publicMediaOrigin());
}
