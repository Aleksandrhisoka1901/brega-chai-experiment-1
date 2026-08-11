import "server-only";

import { fetchCms } from "./client";
import { DEFAULT_ROBOTS_CONTENT, mapRobotsPayload } from "./robots-mapper";

export async function getRobotsContent(): Promise<string> {
  try {
    const payload = await fetchCms("/api/robots-txt?fields[0]=content", {
      tags: ["robots"],
      revalidate: 0,
    });

    return mapRobotsPayload(payload);
  } catch {
    return DEFAULT_ROBOTS_CONTENT;
  }
}
