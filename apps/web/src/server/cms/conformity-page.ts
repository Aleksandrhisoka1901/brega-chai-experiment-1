import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import {
  mapConformityPagePayload,
  conformityPageRequest,
} from "./conformity-page-mapper";

export async function getConformityPage() {
  const request = conformityPageRequest();
  const payload = await fetchCms(request.path, { tags: [...request.tags] });
  return mapConformityPagePayload(payload, publicMediaOrigin());
}
