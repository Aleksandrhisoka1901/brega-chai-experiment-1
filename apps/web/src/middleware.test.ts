import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server.js";

import {
  middleware,
  SERVICE_UNAVAILABLE_PATH,
  SITEMAP_PLUGIN_PATH,
} from "./middleware.ts";

const withCmsReadiness = async (status: number, run: () => Promise<void>) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status });

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("rewrites public pages to an honest 503 when CMS is unavailable", async () => {
  await withCmsReadiness(503, async () => {
    const response = await middleware(
      new NextRequest("https://brega.example/stantsii"),
    );

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(
      response.headers.get("x-middleware-rewrite") ?? "",
      new RegExp(`${SERVICE_UNAVAILABLE_PATH}$`),
    );
  });
});

test("does not run readiness checks for internal and non-page routes", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(null, { status: 503 });
  };

  try {
    for (const path of [
      SERVICE_UNAVAILABLE_PATH,
      "/api/checkout/orders",
      "/_next/static/chunk.js",
      "/documents/privacy.pdf",
    ]) {
      const response = await middleware(
        new NextRequest(`https://brega.example${path}`),
      );
      assert.equal(response.status, 200);
    }
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxies the public sitemap to the Strapi plugin at runtime", async () => {
  const originalFetch = globalThis.fetch;
  const originalCmsUrl = process.env.CMS_INTERNAL_URL;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(null, { status: 503 });
  };
  process.env.CMS_INTERNAL_URL = "http://cms.internal:1337";

  try {
    const response = await middleware(
      new NextRequest("https://brega.example/sitemap.xml?preview=1"),
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("x-middleware-rewrite"),
      `http://cms.internal:1337${SITEMAP_PLUGIN_PATH}?preview=1`,
    );
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCmsUrl === undefined) delete process.env.CMS_INTERNAL_URL;
    else process.env.CMS_INTERNAL_URL = originalCmsUrl;
  }
});

test("proxies configured legal PDFs while preserving their public URLs", async () => {
  const originalFetch = globalThis.fetch;
  const originalCmsUrl = process.env.CMS_INTERNAL_URL;
  const originalMediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({
      data: {
        legalDocuments: {
          privacyPolicy: {
            mime: "application/pdf",
            url: "/uploads/privacy-v2.pdf",
          },
        },
      },
    });
  };
  process.env.CMS_INTERNAL_URL = "http://cms.internal:1337";
  process.env.NEXT_PUBLIC_MEDIA_URL = "https://media.brega.example";

  try {
    const response = await middleware(
      new NextRequest("https://brega.example/legal/privacy.pdf"),
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("x-middleware-rewrite"),
      "https://media.brega.example/uploads/privacy-v2.pdf",
    );
    assert.match(
      requestedUrl,
      /^http:\/\/cms\.internal:1337\/api\/global-setting\?/,
    );
    assert.match(requestedUrl, /privacyPolicy/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCmsUrl === undefined) delete process.env.CMS_INTERNAL_URL;
    else process.env.CMS_INTERNAL_URL = originalCmsUrl;
    if (originalMediaUrl === undefined)
      delete process.env.NEXT_PUBLIC_MEDIA_URL;
    else process.env.NEXT_PUBLIC_MEDIA_URL = originalMediaUrl;
  }
});

test("returns 404 when a legal PDF is missing or has another media type", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      data: {
        legalDocuments: {
          terms: {
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            url: "/uploads/terms.docx",
          },
        },
      },
    });

  try {
    const response = await middleware(
      new NextRequest("https://brega.example/legal/terms.pdf"),
    );

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns 503 for legal PDFs when CMS cannot be reached", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("network unavailable");
  };

  try {
    const response = await middleware(
      new NextRequest("https://brega.example/legal/privacy.pdf"),
    );

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("continues public navigation when CMS readiness is healthy", async () => {
  const originalFetch = globalThis.fetch;
  let readinessRequest: { input: string; cache?: RequestCache } | undefined;
  globalThis.fetch = async (input, init) => {
    readinessRequest = {
      input: String(input),
      ...(init?.cache ? { cache: init.cache } : {}),
    };
    return new Response(null, { status: 204 });
  };

  try {
    const response = await middleware(
      new NextRequest("https://brega.example/stantsii"),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.deepEqual(readinessRequest, {
      input: "http://127.0.0.1:1337/api/health/readiness",
      cache: "no-store",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirects supported dirty URLs to their canonical URL in one 301", async () => {
  const cases = [
    {
      source: "/TOVARY/DA-HUN-PAO/",
      target: "/stantsii/da-hun-pao",
    },
    { source: "/index.html", target: "/" },
    {
      source: "/index.php?utm_source=test&empty=",
      target: "/?utm_source=test",
    },
    {
      source: "/stantsii/---/da-hun-pao",
      target: "/stantsii/da-hun-pao",
    },
    {
      source: "/NABORY/MEDLENNOE-UTRO/",
      target: "/paneli/medlennoe-utro",
    },
  ];

  await withCmsReadiness(204, async () => {
    for (const { source, target } of cases) {
      const response = await middleware(
        new NextRequest(`https://brega.example${source}`),
      );

      assert.equal(response.status, 301, source);
      assert.equal(
        response.headers.get("location"),
        `https://brega.example${target}`,
        source,
      );

      const finalResponse = await middleware(
        new NextRequest(`https://brega.example${target}`),
      );
      assert.equal(finalResponse.status, 200, `redirect chain for ${source}`);
      assert.equal(
        finalResponse.headers.get("x-middleware-next"),
        "1",
        `redirect chain for ${source}`,
      );
    }
  });
});

test("preserves canonical and unknown entity URLs for the server data layer", async () => {
  await withCmsReadiness(204, async () => {
    for (const path of [
      "/stantsii?utm_source=mail",
      "/stantsii/unknown-slug",
      "/paneli/unknown-slug",
    ]) {
      const response = await middleware(
        new NextRequest(`https://brega.example${path}`),
      );

      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("x-middleware-next"), "1", path);
    }
  });
});

test("does not redirect removed pre-production routes", async () => {
  await withCmsReadiness(204, async () => {
    for (const path of [
      "/products",
      "/product/tea",
      "/rituals/tea",
      "/ritual/tea",
    ]) {
      const response = await middleware(
        new NextRequest(`https://brega.example${path}`),
      );

      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("location"), null, path);
      assert.equal(response.headers.get("x-middleware-next"), "1", path);
    }
  });
});
