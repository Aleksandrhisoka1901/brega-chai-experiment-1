import "server-only";

import { resolveRobotsContent } from "@/lib/seo/indexing";

import { fetchCms } from "./client";
import { DEFAULT_ROBOTS_CONTENT, mapRobotsPayload } from "./robots-mapper";

export async function getRobotsContent(): Promise<string> {
  try {
    const payload = await fetchCms("/api/robots-txt?fields[0]=content", {
      tags: ["robots"],
      revalidate: 0,
    });

    return resolveRobotsContent(mapRobotsPayload(payload));
  } catch {
    return resolveRobotsContent(DEFAULT_ROBOTS_CONTENT);
  }
}
