import { randomBytes } from "node:crypto";

export type Transliterate = (value: string) => string;
export type SlugExists = (slug: string) => Promise<boolean>;
export type HexSuffix = () => string;

const FALLBACK_BASE = "product";
const MAX_ATTEMPTS = 32;

export function normalizeSlugBase(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 173)
      .replace(/-+$/g, "") || FALLBACK_BASE
  );
}

export function createSlugCandidate(
  title: string,
  transliterate: Transliterate,
  suffix: string,
): string {
  if (!/^[0-9a-f]{6}$/.test(suffix)) {
    throw new Error(
      "Slug suffix must contain exactly 6 lowercase hex characters",
    );
  }

  return `${normalizeSlugBase(transliterate(title))}-${suffix}`;
}

export function randomHexSuffix(): string {
  return randomBytes(3).toString("hex");
}

export async function generateUniqueSlug({
  title,
  transliterate,
  exists,
  suffix = randomHexSuffix,
}: {
  title: string;
  transliterate: Transliterate;
  exists: SlugExists;
  suffix?: HexSuffix;
}): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = createSlugCandidate(title, transliterate, suffix());

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
    throw new Error("Product slug cannot be changed after creation");
  }
}
