import { transliterate } from "transliteration";

export type Transliterate = (value: string) => string;
export type SlugExists = (slug: string) => Promise<boolean>;

const FALLBACK_BASE = "item";
const MAX_ATTEMPTS = 10_000;

export function transliterateCatalogTitle(value: string): string {
  return transliterate(value, {
    replace: { Х: "Kh", х: "kh" },
  });
}

export function normalizeSlugBase(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180)
      .replace(/-+$/g, "") || FALLBACK_BASE
  );
}

export async function generateUniqueSlug({
  title,
  transliterate,
  exists,
}: {
  title: string;
  transliterate: Transliterate;
  exists: SlugExists;
}): Promise<string> {
  const base = normalizeSlugBase(transliterate(title));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${base.slice(0, 180 - suffix.length)}${suffix}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error(
    `Could not generate a unique slug after ${MAX_ATTEMPTS} attempts`,
  );
}

export function assertSlugImmutable(
  currentSlug: string,
  nextSlug: unknown,
): void {
  if (nextSlug !== undefined && nextSlug !== currentSlug) {
    throw new Error("Catalog item slug cannot be changed after publication");
  }
}

export function shouldGenerateSlug(slug: unknown): boolean {
  return typeof slug !== "string" || slug.trim().length === 0;
}

export function shouldRegenerateDraftSlug({
  currentDisplayName,
  nextDisplayName,
  hasPublishedVersion,
}: {
  currentDisplayName: string;
  nextDisplayName: unknown;
  hasPublishedVersion: boolean;
}): boolean {
  return (
    !hasPublishedVersion &&
    typeof nextDisplayName === "string" &&
    nextDisplayName.trim().length > 0 &&
    nextDisplayName !== currentDisplayName
  );
}
