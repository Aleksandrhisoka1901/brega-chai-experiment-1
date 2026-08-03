import { expect, test } from "@playwright/test";

test("header, catalog cards, and breadcrumbs support keyboard navigation", async ({
  page,
}) => {
  await page.goto("/");

  const productsNavigation = page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Сорта" });
  await productsNavigation.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/tovary");

  const firstProduct = page.locator(".product-grid").getByRole("link").first();
  await expect(firstProduct).toHaveAccessibleName(/Да\s+Хун\s+Пао/);
  await firstProduct.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/tovary/published-product");

  const catalogBreadcrumb = page
    .getByRole("navigation", { name: "Хлебные крошки" })
    .getByRole("link", { name: "Сорта" });
  await catalogBreadcrumb.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/tovary");
});
