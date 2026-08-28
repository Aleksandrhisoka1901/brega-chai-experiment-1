export const HOME_PAGE_UID = "api::home-page.home-page";

export const STOREFRONT_INK = "#1E2329";
export const STOREFRONT_SAGE = "#22A06B";
export const STOREFRONT_PAPER = "#F5F7FA";

const FLAT_HERO_BACKGROUNDS = new Set(["#d7cfbe"]);

type DocumentStatus = "draft" | "published";
type ColorComponent = Record<string, unknown> & {
  id?: unknown;
  backgroundColor?: string | null;
  textColor?: string | null;
};

function parseHex(value: string): [number, number, number] | undefined {
  const hex = value.trim().replace(/^#/, "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;
  if (!/^[\da-f]{6}$/i.test(normalized)) return undefined;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function channel(value: number) {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(a: string, b: string) {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return undefined;
  const luminance = (rgb: [number, number, number]) =>
    0.2126 * channel(rgb[0]) +
    0.7152 * channel(rgb[1]) +
    0.0722 * channel(rgb[2]);
  const [higher, lower] = [luminance(first), luminance(second)].sort(
    (left, right) => right - left,
  );
  return (higher + 0.05) / (lower + 0.05);
}

function hasReadableContrast(
  foreground?: string | null,
  background?: string | null,
) {
  const text = foreground?.trim();
  const surface = background?.trim();
  if (!text || !surface) return true;
  const ratio = contrastRatio(text, surface);
  return ratio != null && ratio >= 3;
}

function normalizeHex(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function shouldResetAboutColors(about?: ColorComponent | null) {
  if (!about) return false;
  const background = about.backgroundColor?.trim();
  const text = about.textColor?.trim();
  if (background && text) return !hasReadableContrast(text, background);
  if (background) return !hasReadableContrast(STOREFRONT_INK, background);
  if (text) return !hasReadableContrast(text, STOREFRONT_PAPER);
  return false;
}

export function shouldRestoreHeroPalette(hero?: ColorComponent | null) {
  if (!hero) return false;
  const background = normalizeHex(hero.backgroundColor);
  if (FLAT_HERO_BACKGROUNDS.has(background)) return true;
  const text = hero.textColor?.trim() || STOREFRONT_PAPER;
  const surface = hero.backgroundColor?.trim() || STOREFRONT_INK;
  return !hasReadableContrast(text, surface);
}

export async function ensureHomeEditorialPalette(strapi: any) {
  const documents = strapi.documents(HOME_PAGE_UID);

  for (const status of ["draft", "published"] satisfies DocumentStatus[]) {
    const homes = await documents.findMany({
      status,
      populate: ["hero", "about"],
    });

    for (const home of homes as Array<{
      hero?: ColorComponent | null;
      about?: ColorComponent | null;
    }>) {
      if (home.hero?.id != null && shouldRestoreHeroPalette(home.hero)) {
        await strapi.db.query("home.hero").update({
          where: { id: home.hero.id },
          data: {
            backgroundColor: STOREFRONT_INK,
            textColor: STOREFRONT_PAPER,
          },
        });
      }
      if (home.about?.id != null && shouldResetAboutColors(home.about)) {
        await strapi.db.query("home.editorial-section").update({
          where: { id: home.about.id },
          data: {
            backgroundColor: null,
            textColor: null,
          },
        });
      }
    }
  }
}
