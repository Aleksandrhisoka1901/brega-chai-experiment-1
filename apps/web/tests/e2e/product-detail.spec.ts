import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("published product has a vertical keyboard-operable gallery @smoke", async ({
  page,
}) => {
  await page.goto("/products/published-product");

  await expect(
    page.getByRole("heading", { level: 1, name: "Да Хун Пао" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Как раскрывается чай" }),
  ).toBeVisible();

  const gallery = page.getByRole("group", { name: "Изображения товара" });
  const firstThumbnail = gallery.getByRole("button").first();
  const secondThumbnail = gallery.getByRole("button").nth(1);
  const mainImage = page.getByRole("img", { name: "Пачка чая" });
  const [thumbnailBox, imageBox] = await Promise.all([
    firstThumbnail.boundingBox(),
    mainImage.boundingBox(),
  ]);

  expect(thumbnailBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  expect(thumbnailBox!.x).toBeLessThan(imageBox!.x);
  expect(
    Math.abs(
      (await firstThumbnail.boundingBox())!.x -
        (await secondThumbnail.boundingBox())!.x,
    ),
  ).toBeLessThan(2);

  await secondThumbnail.focus();
  await page.keyboard.press("Enter");

  await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("img", { name: "Сухой чайный лист" }),
  ).toBeVisible();
  await expect(secondThumbnail).toBeFocused();
});

test("quantity starts at one and is capped at five", async ({ page }) => {
  await page.goto("/products/published-product");

  const increase = page.getByRole("button", {
    name: "Увеличить количество",
  });
  const decrease = page.getByRole("button", {
    name: "Уменьшить количество",
  });
  const quantity = page.locator("output");

  await expect(quantity).toHaveText("1");
  await expect(decrease).toBeDisabled();

  for (let index = 0; index < 4; index += 1) {
    await increase.click();
  }

  await expect(quantity).toHaveText("5");
  await expect(increase).toBeDisabled();
});

test("out-of-stock product cannot be added or assigned a quantity", async ({
  page,
}) => {
  await page.goto("/products/out-of-stock-product");

  await expect(page.getByText("Нет в наличии").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Нет в наличии" }),
  ).toBeDisabled();
  await expect(page.getByRole("group", { name: "Количество" })).toHaveCount(0);
});

test("missing product returns the not-found page", async ({ page }) => {
  const response = await page.goto("/products/missing-product");

  expect(response?.status()).toBe(404);
});

test("CMS outage renders a noindex service-unavailable state", async ({
  page,
}) => {
  await page.goto("/products/unavailable-product");

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Страница товара временно недоступна" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("published product has no automatically detectable a11y violations @a11y", async ({
  page,
}) => {
  await page.goto("/products/published-product");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
