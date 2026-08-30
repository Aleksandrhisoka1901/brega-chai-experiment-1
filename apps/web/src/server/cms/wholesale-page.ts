import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  mapWholesalePagePayload,
  wholesalePageRequest,
} from "./wholesale-page-mapper";

export async function getWholesalePage() {
  const request = wholesalePageRequest();
  const payload = await fetchCms(request.path, { tags: [...request.tags] });
  return mapWholesalePagePayload(payload, publicMediaOrigin());
}
