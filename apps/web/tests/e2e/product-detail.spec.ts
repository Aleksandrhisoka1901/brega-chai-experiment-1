import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("published product has a vertical keyboard-operable gallery @smoke", async ({
  page,
}) => {
  await page.goto("/tovary/published-product");

  await expect(page).toHaveTitle(/Да Хун Пао — сорт чая Brega Tea/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Да Хун Пао" }),
  ).toBeVisible();
  await expect(page.getByText("Сорт", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Пакетик (50 г)")).toHaveCSS(
    "font-family",
    /Cormorant/,
  );
  const breadcrumbs = page.getByRole("navigation", {
    name: "Хлебные крошки",
  });
  await expect(
    breadcrumbs.getByRole("link", { name: "Главная" }),
  ).toHaveAttribute("href", "/");
  await expect(
    breadcrumbs.getByRole("link", { name: "Сорта" }),
  ).toHaveAttribute("href", "/tovary");
  await expect(breadcrumbs.getByText("Да Хун Пао")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("Большой красный халат")).toBeVisible();
  const titleSize = await page
    .getByRole("heading", { level: 1, name: "Да Хун Пао" })
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(titleSize).toBeLessThan(80);
  await expect(
    page.getByRole("heading", { level: 2, name: "Как раскрывается чай" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Хранение чая" }),
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
  const transitionedImage = page.getByRole("img", {
    name: "Сухой чайный лист",
  });
  await expect(transitionedImage).toHaveCSS("transition-duration", "0.36s");
  await expect(transitionedImage).toHaveCSS("opacity", "1");
  await expect(page.locator('img[data-active="false"]').first()).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(secondThumbnail).toBeFocused();
});

test("quantity starts at one and is capped at five", async ({ page }) => {
  await page.goto("/tovary/published-product");

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
  await page.goto("/tovary/published-product");
  const populatedSlotHeight = await page
    .locator("[data-original-title-slot]")
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.goto("/tovary/out-of-stock-product");

  const emptySlot = page.locator("[data-original-title-slot]");
  await expect(emptySlot).toHaveCSS("visibility", "hidden");
  expect(
    await emptySlot.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(populatedSlotHeight);
  await expect(page.getByText("Нет в наличии", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Нет в наличии" }),
  ).toBeDisabled();
  await expect(page.getByRole("group", { name: "Количество" })).toHaveCount(0);
});

test("availability is communicated by the purchase action only", async ({
  page,
}) => {
  await page.goto("/tovary/published-product");

  await expect(page.getByText("В наличии", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Добавить в корзину" }),
  ).toBeEnabled();
});

test("missing product returns the not-found page", async ({ page }) => {
  const response = await page.goto("/tovary/missing-product");

  expect(response?.status()).toBe(404);
});

test("CMS outage renders a noindex service-unavailable state", async ({
  page,
}) => {
  await page.goto("/tovary/unavailable-product");

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
  await page.goto("/tovary/published-product");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
