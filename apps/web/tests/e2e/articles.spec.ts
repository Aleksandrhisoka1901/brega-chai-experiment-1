import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("/stati lists article cards with catalog composition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/stati");

  const breadcrumbs = page.getByRole("navigation", {
    name: "Хлебные крошки",
  });
  await expect(breadcrumbs.getByRole("link", { name: "Главная" })).toBeVisible();
  await expect(breadcrumbs.getByText("Статьи")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { level: 1, name: "Статьи" })).toBeVisible();
  await expect(page.getByText("Глава 04", { exact: true })).toBeVisible();

  const articles = page.locator(".article-grid").getByRole("article");
  await expect(articles).toHaveCount(2);
  await expect(articles.getByRole("link").first()).toHaveAttribute(
    "href",
    /^\/stati\//,
  );

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("/stati/[slug] renders title and every cards-grid card", async ({ page }) => {
  await page.goto("/stati");
  await page.locator(".article-grid").getByRole("link").nth(1).click();
  await expect(page).toHaveURL(/\/stati\/tihij-stol$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Тихий стол" }),
  ).toBeVisible();
  await expect(
    page.getByText("Небольшой стол уже собирает ритуал."),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Три простых опоры" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Вода" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Посуда" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Пауза" })).toBeVisible();

  const breadcrumbs = page.getByRole("navigation", { name: "Хлебные крошки" });
  await breadcrumbs.getByRole("link", { name: "Статьи" }).click();
  await expect(page).toHaveURL("/stati");
});
