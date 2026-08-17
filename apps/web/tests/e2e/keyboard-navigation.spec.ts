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

test("ritual navigation, catalog cards, empty cart and breadcrumbs use the landing", async ({
  page,
}) => {
  await page.goto("/");

  const ritualsNavigation = page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Ритуалы" });
  await expect(ritualsNavigation).toHaveAttribute("href", "/nabory");
  await ritualsNavigation.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/nabory");

  const firstRitual = page.getByRole("main").getByRole("article").first();
  await expect(firstRitual.getByRole("link")).toHaveAttribute(
    "href",
    /^\/nabory\//,
  );

  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  const emptyCart = page.getByRole("navigation", {
    name: "Перейти к каталогу",
  });
  await expect(
    emptyCart.getByRole("link", { name: "К ритуалам" }),
  ).toHaveAttribute("href", "/nabory");
  await page.keyboard.press("Escape");

  await page.goto("/nabory/ritual-one");
  const catalogBreadcrumb = page
    .getByRole("navigation", { name: "Хлебные крошки" })
    .getByRole("link", { name: "Ритуалы" });
  await catalogBreadcrumb.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/nabory");
});
