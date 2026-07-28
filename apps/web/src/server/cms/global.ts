import "server-only";

import { fetchCms } from "./client";
import { mapGlobalSettingsPayload, type GlobalSettings } from "./global-mapper";

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const query = new URLSearchParams({
    status: "published",
    "fields[0]": "brandName",
    "fields[1]": "email",
    "fields[2]": "telegramUrl",
    "fields[3]": "legalDetails",
    "populate[navigation]": "true",
  });
  const payload = await fetchCms(`/api/global-setting?${query}`, {
    tags: ["global"],
  });

  return mapGlobalSettingsPayload(payload);
}
