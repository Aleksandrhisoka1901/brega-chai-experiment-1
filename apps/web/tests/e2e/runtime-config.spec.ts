import { expect, test } from "@playwright/test";

test("loads allowlisted runtime config before the client application", async ({
  page,
  request,
}) => {
  const response = await request.get("/runtime-config.js");
  const script = await response.text();

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["content-type"]).toContain(
    "application/javascript",
  );
  expect(script).toContain('"SITE_URL":"http://127.0.0.1:13000"');
  expect(script).toContain('"NEXT_PUBLIC_CMS_URL":"http://127.0.0.1:14338"');
  expect(script).not.toContain("e2e-checkout-form-secret");
  expect(script).not.toContain("e2e-scoped-order-token");

  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:13000",
  );
  await expect
    .poll(() =>
      page.evaluate(() => ({
        siteUrl: window.__APP_CONFIG__?.SITE_URL,
        cmsUrl: window.__APP_CONFIG__?.NEXT_PUBLIC_CMS_URL,
      })),
    )
    .toEqual({
      siteUrl: "http://127.0.0.1:13000",
      cmsUrl: "http://127.0.0.1:14338",
    });
});
