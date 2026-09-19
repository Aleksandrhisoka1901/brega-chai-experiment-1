import "server-only";

import { resolveRobotsContent } from "@/lib/seo/indexing";
import { siteOrigin } from "@/lib/seo/metadata";
import { publicStorefrontRobots } from "@/lib/seo/robots-txt";

export async function getRobotsContent(): Promise<string> {
  return resolveRobotsContent(publicStorefrontRobots(siteOrigin()));
}
