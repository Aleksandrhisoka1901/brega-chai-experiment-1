import { CAPABILITY_PATH, WHOLESALE_PATH } from "./storefront-routes.ts";

export type PrimaryNavLabels = {
  about: string;
  nabory: string;
  tovary: string;
  stati: string;
  optovikam?: string;
  tipovye?: string;
};

export const DEFAULT_PRIMARY_NAV_LABELS = {
  about: "О компании",
  nabory: "Солнечные панели",
  tovary: "Электростанции",
  stati: "Статьи",
  optovikam: "Для оптовиков",
  tipovye: "Системы хранения энергии",
} as const;

export function buildPrimaryNavLinks(navigation: PrimaryNavLabels) {
  return [
    { href: "/#about", label: navigation.about },
    { href: "/stantsii", label: navigation.tovary },
    { href: "/paneli", label: navigation.nabory },
    {
      href: WHOLESALE_PATH,
      label: navigation.optovikam ?? DEFAULT_PRIMARY_NAV_LABELS.optovikam,
    },
    {
      href: CAPABILITY_PATH,
      label: navigation.tipovye ?? DEFAULT_PRIMARY_NAV_LABELS.tipovye,
    },
    { href: "/stati", label: navigation.stati },
  ];
}

export function isPrimaryNavCurrent(href: string, pathname: string) {
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
