import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile overlays contain scroll and honor reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stantsii/published-product");

  const galleryImage = page.getByRole("img", { name: "Пачка чая" });
  await expect(galleryImage).toHaveCSS("transition-duration", "0s");

  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.click();

  const cart = page.locator("[data-cart-drawer]");
  await expect(cart).toHaveCSS("animation-name", "none");
  await expect(cart).toHaveCSS("overscroll-behavior", "contain");
  await page.getByRole("button", { name: "Закрыть корзину" }).click();

  await page.getByRole("button", { name: "Открыть меню" }).click();
  const menu = page.locator("[data-mobile-menu]");
  await expect(menu).toHaveCSS("animation-name", "none");
  await expect(menu).toHaveCSS("overscroll-behavior", "contain");
});

test("browser chrome matches the storefront surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f5f7fa",
  );
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
  await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveAttribute(
    "href",
    "/favicon.png",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );

  const favicon = await page.request.get("/favicon.svg");
  expect(favicon.ok()).toBe(true);
  expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
  expect(await favicon.text()).toContain("#ff9c0d");

  const pngFavicon = await page.request.get("/favicon.png");
  expect(pngFavicon.ok()).toBe(true);
  expect(pngFavicon.headers()["content-type"]).toContain("image/png");
  const pngBody = Buffer.from(await pngFavicon.body());
  expect(pngBody.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
    true,
  );

  const legacyFavicon = await page.request.get("/favicon.ico");
  expect(legacyFavicon.ok()).toBe(true);
  expect(legacyFavicon.headers()["content-type"]).toMatch(
    /image\/(x-icon|vnd\.microsoft\.icon|ico)/i,
  );
  const legacyBody = Buffer.from(await legacyFavicon.body());
  expect(legacyBody.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).toBe(
    true,
  );

  const appleTouchIcon = await page.request.get("/apple-touch-icon.png");
  expect(appleTouchIcon.ok()).toBe(true);
  expect(appleTouchIcon.headers()["content-type"]).toContain("image/png");
});
