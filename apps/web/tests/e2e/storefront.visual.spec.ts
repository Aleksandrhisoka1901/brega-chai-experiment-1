import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function openStablePage(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.getByRole("main")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).complete),
        ),
    )
    .toBe(true);
}

for (const viewport of viewports) {
  for (const target of [
    { name: "home", path: "/" },
    { name: "catalog", path: "/tovary" },
    { name: "product", path: "/tovary/published-product" },
  ] as const) {
    test(`${target.name} ${viewport.name} visual baseline @visual`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openStablePage(page, target.path);

      await expect(page).toHaveScreenshot(
        `${target.name}-${viewport.name}.png`,
        {
          animations: "disabled",
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        },
      );
    });
  }
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
] as const) {
  test(`commerce drawer ${viewport.name} visual baseline @visual`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openStablePage(page, "/tovary/published-product");

    await page.getByRole("button", { name: "Добавить в корзину" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot(`cart-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });

    await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Оформление" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("radio", { name: /Самовывоз/ }),
    ).toBeVisible();
    await expect(dialog).toHaveScreenshot(`checkout-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });

    await dialog.getByRole("radio", { name: /Самовывоз/ }).check();
    await expect(dialog.getByText(/г\. Москва, ул\. Чайная/)).toBeVisible();
    await expect(dialog).toHaveScreenshot(
      `checkout-pickup-${viewport.name}.png`,
      {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );

    const checkoutScroller = dialog.locator("form").locator("..");
    await checkoutScroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(dialog.getByText("Со скидкой за самовывоз")).toBeVisible();
    await expect(dialog).toHaveScreenshot(
      `checkout-pickup-summary-${viewport.name}.png`,
      {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      },
    );
  });
}
