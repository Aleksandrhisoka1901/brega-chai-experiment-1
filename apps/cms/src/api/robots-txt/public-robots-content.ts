const SEARCH_CRAWLER_USER_AGENTS = [
  "Applebot",
  "DuckDuckBot",
  "Googlebot",
  "Mail.RU_Bot",
  "TelegramBot",
  "Twitterbot",
  "YandexBot",
  "bingbot",
  "facebookexternalhit",
] as const;

const BLOCKED_USER_AGENTS = [
  "01h4x.com",
  "360Spider",
  "404checker",
  "404enemy",
  "ADmantX",
  "ASPSeek",
  "Abonti",
  "Aboundex",
  "Aboundexbot",
  "Acunetix",
  "AdsTxtCrawlerTP",
  "AhrefsBot",
  "AiHitBot",
  "Amazonbot",
  "AnomieBOT",
  "Applebot-Extended",
  "AspiegelBot",
  "AwarioBot",
  "AwarioRssBot",
  "AwarioSmartBot",
  "BLEXBot",
  "BacklinkCrawler",
  "Barkrowler",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "ChatGPT-User",
  "CensysInspect",
  "Claude-Web",
  "DataForSeoBot",
  "Diffbot",
  "DirBuster",
  "DotBot",
  "Exabot",
  "FacebookBot",
  "GPTBot",
  "Google-Extended",
  "GrapeshotCrawler",
  "HTTrack",
  "HaosouSpider",
  "Heritrix",
  "ImagesiftBot",
  "IonCrawl",
  "IstellaBot",
  "JamesBOT",
  "Linguee",
  "LinkpadBot",
  "MJ12bot",
  "Magpie-Crawler",
  "Masscan",
  "MauiBot",
  "MegaIndex.ru",
  "MetaURI",
  "Nmap",
  "Nuclei",
  "Nutch",
  "OAI-SearchBot",
  "OpenVAS",
  "PaloAltoNetwork",
  "PetalBot",
  "PiplBot",
  "Proximic",
  "Rogerbot",
  "SEOkicks",
  "SEMrushBot",
  "SISTRIX",
  "Scrapy",
  "Screaming Frog SEO Spider",
  "SeekportBot",
  "SemrushBot",
  "SeobilityBot",
  "SeostarBot",
  "Serpstatbot",
  "SiteAuditBot",
  "Sogou",
  "Sqlmap",
  "Timpibot",
  "TurnitinBot",
  "VelenPublicWebCrawler",
  "WPScan",
  "WebZIP",
  "Xenu",
  "YaK",
  "YoudaoBot",
  "ZoominfoBot",
  "adscanner",
  "anthropic-ai",
  "archive.org_bot",
  "awario.com",
  "cohere-ai",
  "coccocbot",
  "cognitiveseo",
  "dataforseo.com",
  "evc-batch",
  "facebookscraper",
  "ia_archiver",
  "imagesift.com",
  "img2dataset",
  "linkdexbot",
  "magpie-crawler",
  "meanpathbot",
  "meta-externalagent",
  "omgili",
  "openai.com",
  "perplexitybot",
  "seekport",
  "t3verse",
] as const;

function uniqueUserAgents(names: readonly string[]) {
  return [...new Set(names)];
}

export const PUBLIC_ROBOTS_BLOCKED_USER_AGENTS = uniqueUserAgents(
  BLOCKED_USER_AGENTS,
);

export const PUBLIC_ROBOTS_SEARCH_CRAWLER_USER_AGENTS = [
  ...SEARCH_CRAWLER_USER_AGENTS,
];

export function publicRobotsContent(
  siteUrl = process.env.SITE_URL ?? "http://localhost:3001",
) {
  const origin = new URL(siteUrl).origin.toLowerCase();
  const blocked = PUBLIC_ROBOTS_BLOCKED_USER_AGENTS.map(
    (name) => `User-agent: ${name}\nDisallow: /`,
  ).join("\n\n");

  return `User-agent: *
Allow: /

Disallow: /api/
Disallow: /service-unavailable-internal
Disallow: /legal/privacy.pdf
Disallow: /legal/terms.pdf
Disallow: /legal/delivery-and-returns.pdf

Disallow: /*?minPrice=
Disallow: /*?maxPrice=
Disallow: /*?*minPrice=
Disallow: /*?*maxPrice=

Disallow: /?amp
Disallow: /?at=
Disallow: /?clckid=
Disallow: /?disable
Disallow: /*?erid=
Disallow: /*?etext=
Disallow: /?fbclid=
Disallow: /*?muid=
Disallow: /?peer_id=
Disallow: /?r=
Disallow: /*?ybaip=
Disallow: /?utm_
Disallow: /*?utm_
Disallow: /*?*utm_
Disallow: /*&utm_
Disallow: /?gclid=
Disallow: /?yclid=
Disallow: /*?yclid=
Disallow: /?ymclid=
Disallow: /?openstat=
Disallow: /?from=
Disallow: /?returnUrl=
Disallow: /?schema=
Disallow: /?spm=
Disallow: /?subscription_unsub=
Disallow: /*?yprqee=
Disallow: /*?ysclid=
Disallow: /?__ym_debug=
Disallow: /?_ym_debug=
Disallow: /?_ym_
Disallow: /?live_unsub=

Disallow: /*?*
Allow: /*?page=

Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&ymclid&gclid&fbclid&erid&etext&from&openstat&_ym_debug&minPrice&maxPrice

${blocked}

Host: ${origin}
Sitemap: ${origin}/sitemap.xml
`;
}
