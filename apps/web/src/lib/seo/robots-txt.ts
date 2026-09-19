export function publicStorefrontRobots(
  siteUrl = process.env.SITE_URL ?? "http://localhost:3000",
) {
  const origin = new URL(siteUrl).origin.toLowerCase();
  const pathRules = `Allow: /

Disallow: /api/
Disallow: /service-unavailable-internal
Disallow: /legal/privacy.pdf
Disallow: /legal/terms.pdf
Disallow: /legal/delivery-and-returns.pdf

Disallow: /*?minPrice=
Disallow: /*?maxPrice=
Disallow: /*?*minPrice=
Disallow: /*?*maxPrice=

Allow: /*?page=`;
  const cleanParam =
    "utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&ymclid&gclid&fbclid&erid&etext&from&openstat&_ym_debug";

  return `User-agent: Yandex
${pathRules}

Clean-param: ${cleanParam}

Sitemap: ${origin}/sitemap.xml

User-agent: YandexBot
${pathRules}

User-agent: YandexWebmaster
Allow: /

User-agent: YandexAdditionalBot
Allow: /

User-agent: YandexAdditional
Allow: /

User-agent: *
${pathRules}

Sitemap: ${origin}/sitemap.xml
`;
}
