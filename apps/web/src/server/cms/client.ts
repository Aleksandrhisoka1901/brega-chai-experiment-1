import "server-only";

import { CmsUnavailableError } from "./errors";

const CMS_TIMEOUT_MS = 5_000;

export async function fetchCms(
  path: string,
  options: { tags: string[]; revalidate?: number },
) {
  const baseUrl = process.env.CMS_INTERNAL_URL ?? "http://127.0.0.1:1337";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CMS_TIMEOUT_MS);
  const cacheOptions =
    process.env.NODE_ENV === "development"
      ? ({ cache: "no-store" } as const)
      : ({
          next: {
            revalidate: options.revalidate ?? 300,
            tags: options.tags,
          },
        } as const);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      headers: { Accept: "application/json" },
      ...cacheOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => ""))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240);
      throw new CmsUnavailableError(
        detail
          ? `CMS responded with ${response.status}: ${detail}`
          : `CMS responded with ${response.status}`,
      );
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof CmsUnavailableError) throw error;
    throw new CmsUnavailableError(
      error instanceof Error ? error.message : undefined,
    );
  } finally {
    clearTimeout(timeout);
  }
}
