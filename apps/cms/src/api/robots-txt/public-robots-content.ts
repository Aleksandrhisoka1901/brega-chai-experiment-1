const SEARCH_CRAWLER_USER_AGENTS = [
  "Applebot",
  "DuckDuckBot",
  "Googlebot",
  "Mail.RU_Bot",
  "TelegramBot",
  "Twitterbot",
  "YandexAdditional",
  "YandexAdditionalBot",
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

export function shouldSyncPublicRobotsContent(
  siteUrl = process.env.SITE_URL ?? "",
) {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase();
    return (
      hostname.length > 0 &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
    );
  } catch {
    return false;
  }
}

export async function ensurePublicRobotsContent(
  strapi: {
    documents: (uid: string) => {
      findFirst(options: { fields: string[] }): Promise<{
        documentId?: string;
        content?: string | null;
      } | null>;
      create(options: { data: { content: string } }): Promise<unknown>;
      update(options: {
        documentId: string;
        data: { content: string };
      }): Promise<unknown>;
    };
  },
  siteUrl = process.env.SITE_URL ?? "http://localhost:3001",
) {
  if (!shouldSyncPublicRobotsContent(siteUrl)) return;

  const content = publicRobotsContent(siteUrl);
  const documents = strapi.documents("api::robots-txt.robots-txt");
  const existing = await documents.findFirst({ fields: ["content"] });
  if (!existing?.documentId) {
    await documents.create({ data: { content } });
    return;
  }
  if (existing.content === content) return;
  await documents.update({
    documentId: existing.documentId,
    data: { content },
  });
}

