export function versionCmsMediaUrl(
  path: string,
  publicBase: string,
  updatedAt?: string,
) {
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;

  let resolved: URL;
  try {
    resolved = new URL(path, publicBase);
  } catch {
    return path;
  }

  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return path;
  }

  let url: URL;
  try {
    url = new URL(`${resolved.pathname}${resolved.search}`, publicBase);
  } catch {
    return path;
  }

  if (updatedAt) url.searchParams.set("v", updatedAt);
  return url.toString();
}
