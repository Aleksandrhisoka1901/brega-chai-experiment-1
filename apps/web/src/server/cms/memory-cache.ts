type CmsMemoryCacheEntry = {
  expiresAt: number;
  tags: string[];
  value: unknown;
};

const memoryCache = new Map<string, CmsMemoryCacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function isLocalSiteUrl(siteUrl = process.env.SITE_URL) {
  if (!siteUrl) return true;

  try {
    const { hostname } = new URL(siteUrl);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

export function shouldUseCmsMemoryCache(siteUrl = process.env.SITE_URL) {
  return !isLocalSiteUrl(siteUrl);
}

export function readCmsMemoryCache(path: string) {
  const entry = memoryCache.get(path);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(path);
    return undefined;
  }
  return entry.value;
}

export function writeCmsMemoryCache(
  path: string,
  tags: string[],
  revalidateSeconds: number,
  value: unknown,
) {
  if (revalidateSeconds <= 0 || !shouldUseCmsMemoryCache()) return;
  memoryCache.set(path, {
    expiresAt: Date.now() + revalidateSeconds * 1000,
    tags,
    value,
  });
}

export function invalidateCmsMemoryCache(tag?: string) {
  if (!tag) {
    memoryCache.clear();
    return;
  }

  for (const [path, entry] of memoryCache) {
    if (entry.tags.includes(tag)) memoryCache.delete(path);
  }
}

export async function withCmsInFlight<T>(
  path: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(path);
  if (existing) return existing as Promise<T>;

  const pending = load().finally(() => {
    inFlight.delete(path);
  });
  inFlight.set(path, pending);
  return pending;
}
