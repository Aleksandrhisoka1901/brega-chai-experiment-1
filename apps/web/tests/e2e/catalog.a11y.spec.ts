import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("catalog stays compact, continuous, and accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tovary");

  const breadcrumbs = page.getByRole("navigation", {
    name: "Хлебные крошки",
  });
  await expect(
    breadcrumbs.getByRole("link", { name: "Главная" }),
  ).toBeVisible();
  await expect(breadcrumbs.getByText("Сорта")).toHaveAttribute(
    "aria-current",
    "page",
  );

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Сорта",
    }),
  ).toBeVisible();
  await expect(page.getByText("Глава 03", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Все сорта" })).toHaveCount(0);

  const productGrid = page.locator(".product-grid");
  await expect(productGrid.locator(".product-card")).toHaveCount(6);
  await expect(productGrid).toHaveCSS("gap", "0px");
  await expect(productGrid).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const gridBox = await productGrid.boundingBox();
  expect(gridBox?.y).toBeLessThan(500);
  const wordmarkBox = await page
    .getByRole("link", { name: "Brega Tea — главная" })
    .boundingBox();
  expect(Math.abs((wordmarkBox?.x ?? 0) - (gridBox?.x ?? 0))).toBeLessThan(2);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К содержимому" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
