import { expect, test } from "@playwright/test";

const redirectCases = [
  {
    source: "/TOVARY/PUBLISHED-PRODUCT/",
    target: "/tovary/published-product",
  },
  { source: "/index.html", target: "/" },
  {
    source: "/index.php?utm_source=test&empty=",
    target: "/?utm_source=test",
  },
  {
    source: "/tovary/---/published-product",
    target: "/tovary/published-product",
  },
  {
    source: "/NABORY/RITUAL-ONE/",
    target: "/nabory/ritual-one",
  },
];

test("supported dirty URLs use one permanent redirect to canonical pages", async ({
  baseURL,
  request,
}) => {
  expect(baseURL).toBeTruthy();

  for (const { source, target } of redirectCases) {
    const redirect = await request.get(source, { maxRedirects: 0 });

    expect(redirect.status(), source).toBe(301);
    const location = redirect.headers().location;
    expect(location, source).toBeTruthy();
    expect(new URL(location!, baseURL).pathname).toBe(
      new URL(target, baseURL).pathname,
    );
    expect(new URL(location!, baseURL).search).toBe(
      new URL(target, baseURL).search,
    );

    const final = await request.get(target, { maxRedirects: 0 });
    expect(final.status(), `redirect chain for ${source}`).toBe(200);
  }
});

test("unknown entities stay 404 and static resources bypass canonicalization", async ({
  request,
}) => {
  const unknown = await request.get("/tovary/unknown-slug", {
    maxRedirects: 0,
  });
  expect(unknown.status()).toBe(404);

  const pdf = await request.get("/legal/privacy.pdf", { maxRedirects: 0 });
  expect(pdf.status()).toBe(200);
  expect(pdf.headers().location).toBeUndefined();
});

test("removed pre-production routes do not redirect", async ({ request }) => {
  for (const path of [
    "/products",
    "/product/published-product",
    "/catalog",
    "/rituals/ritual-one",
    "/ritual/ritual-one",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(response.headers().location, path).toBeUndefined();
  }
});
