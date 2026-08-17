export function versionCmsMediaUrl(
  path: string,
  publicBase: string,
  updatedAt?: string,
) {
  let url: URL;
  try {
    url = new URL(path, publicBase);
  } catch {
    return path;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return path;
  if (updatedAt) url.searchParams.set("v", updatedAt);
  return url.toString();
}
