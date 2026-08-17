import "server-only";

import { publicMediaOrigin } from "@/server/public-runtime-config";

import { fetchCms } from "./client";
import { fetchRitualsPageContent } from "./rituals-page-mapper";

export async function getRitualsPage() {
  return fetchRitualsPageContent(fetchCms, publicMediaOrigin());
}
