import { type NextRequest, NextResponse } from "next/server.js";

export const SERVICE_UNAVAILABLE_PATH = "/service-unavailable-internal";

const CMS_READINESS_TIMEOUT_MS = 2_000;
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

export async function middleware(request: NextRequest) {
  if (
    (request.method !== "GET" && request.method !== "HEAD") ||
    isExcludedPath(request.nextUrl.pathname)
  ) {
    return NextResponse.next();
  }

  if (!(await isCmsReady())) {
    return serviceUnavailableResponse(request);
  }

  return canonicalRedirect(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
