import { type NextRequest, NextResponse } from "next/server.js";

export const SERVICE_UNAVAILABLE_PATH = "/service-unavailable-internal";
export const SITEMAP_PLUGIN_PATH = "/api/strapi-5-sitemap-plugin/sitemap.xml";

const CMS_READINESS_TIMEOUT_MS = 2_000;
const LEGAL_DOCUMENT_PATHS = {
  "/legal/privacy.pdf": "privacyPolicy",
  "/legal/terms.pdf": "terms",
  "/legal/delivery-and-returns.pdf": "deliveryAndReturns",
} as const;
const FILE_PATH = /\.[^/]+$/;
const INDEX_ALIAS = /^\/index\.(?:html|php)$/i;
const GARBAGE_SEGMENT = /^[^\p{L}\p{N}]+$/u;

const isExcludedPath = (pathname: string) =>
  pathname === SERVICE_UNAVAILABLE_PATH ||
  pathname === "/favicon.ico" ||
  pathname.startsWith("/api/") ||
  pathname.startsWith("/_next/") ||
  (FILE_PATH.test(pathname) && !INDEX_ALIAS.test(pathname));

const isCmsReady = async () => {
  const baseUrl = process.env.CMS_INTERNAL_URL ?? "http://127.0.0.1:1337";

  try {
    const response = await fetch(new URL("/api/health/readiness", baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(CMS_READINESS_TIMEOUT_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const canonicalPathname = (pathname: string) => {
  if (INDEX_ALIAS.test(pathname)) {
    return "/";
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !GARBAGE_SEGMENT.test(segment))
    .map((segment) => segment.toLocaleLowerCase("ru"));

  return segments.length > 0 ? `/${segments.join("/")}` : "/";
};

export const canonicalSearch = (searchParams: URLSearchParams) => {
  const canonicalParams = new URLSearchParams();

  for (const [name, value] of searchParams) {
    if (value !== "") {
      canonicalParams.append(name, value);
    }
  }

  const search = canonicalParams.toString();
  return search ? `?${search}` : "";
};

const canonicalRedirect = (request: NextRequest) => {
  const target = new URL(request.url);
  target.pathname = canonicalPathname(request.nextUrl.pathname);
  target.search = canonicalSearch(request.nextUrl.searchParams);

  const current = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const canonical = `${target.pathname}${target.search}`;

  return current === canonical ? null : NextResponse.redirect(target, 301);
};

const serviceUnavailableResponse = (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-brega-service-unavailable", "1");

  return NextResponse.rewrite(new URL(SERVICE_UNAVAILABLE_PATH, request.url), {
    request: { headers: requestHeaders },
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": "60",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};

const sitemapResponse = (request: NextRequest) => {
  if (request.nextUrl.pathname !== "/sitemap.xml") return null;

  const cmsUrl = process.env.CMS_INTERNAL_URL ?? "http://127.0.0.1:1337";
  const target = new URL(SITEMAP_PLUGIN_PATH, cmsUrl);
  target.search = request.nextUrl.search;
  return NextResponse.rewrite(target);
};

const legalDocumentResponse = async (request: NextRequest) => {
  const field =
    LEGAL_DOCUMENT_PATHS[
      request.nextUrl.pathname as keyof typeof LEGAL_DOCUMENT_PATHS
    ];
  if (!field) return null;

  const cmsUrl = process.env.CMS_INTERNAL_URL ?? "http://127.0.0.1:1337";
  const publicMediaUrl =
    process.env.NEXT_PUBLIC_MEDIA_URL ??
    process.env.NEXT_PUBLIC_CMS_URL ??
    cmsUrl;
  const query = new URLSearchParams({ status: "published" });
  query.set(`populate[legalDocuments][populate][${field}][fields][0]`, "url");
  query.set(`populate[legalDocuments][populate][${field}][fields][1]`, "mime");

  try {
    const response = await fetch(
      new URL(`/api/global-setting?${query}`, cmsUrl),
      {
        next: { revalidate: 300, tags: ["global"] },
        signal: AbortSignal.timeout(CMS_READINESS_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return new NextResponse(null, {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "60",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    const payload = (await response.json()) as {
      data?: {
        legalDocuments?: Partial<
          Record<
            (typeof LEGAL_DOCUMENT_PATHS)[keyof typeof LEGAL_DOCUMENT_PATHS],
            { mime?: string; url?: string } | null
          >
        > | null;
      } | null;
    };
    const document = payload.data?.legalDocuments?.[field];
    if (!document?.url || document.mime !== "application/pdf") {
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    const target = new URL(document.url, publicMediaUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }
    return NextResponse.rewrite(target);
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "60",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
};

export async function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const sitemap = sitemapResponse(request);
  if (sitemap) return sitemap;

  const legalDocument = await legalDocumentResponse(request);
  if (legalDocument) return legalDocument;

  if (isExcludedPath(request.nextUrl.pathname)) return NextResponse.next();

  if (!(await isCmsReady())) {
    return serviceUnavailableResponse(request);
  }

  return canonicalRedirect(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
