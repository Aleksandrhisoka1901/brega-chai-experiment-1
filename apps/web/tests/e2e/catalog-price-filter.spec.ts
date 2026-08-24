import { expect, test, type Page } from "@playwright/test";

async function expectCanonical(page: Page, path: string) {
  const href = new URL(path, page.url()).toString();
  const canonical = page.locator(`link[rel="canonical"][href="${href}"]`);

  await expect(canonical).toHaveCount(1);
}

for (const basePath of ["/tovary", "/nabory"] as const) {
  test(`${basePath} filters products by price and keeps pagination in the query`, async ({
    page,
  }) => {
    await page.goto(basePath);

    const filter = page.getByRole("form", { name: "Фильтр по цене" });
    await expect(filter.getByLabel("Цена от")).toBeVisible();
    await expect(filter.getByLabel("Цена до")).toBeVisible();

    await filter.getByLabel("Цена от").fill("1500");
    await filter.getByRole("button", { name: "Применить" }).click();

    await expect(page).toHaveURL(new RegExp(`${basePath}\\?minPrice=1500$`));
    await expectCanonical(page, `${basePath}?minPrice=1500`);
    await expect(filter.getByLabel("Цена от")).toHaveValue("1500");
    await expect(
      page.getByRole("main").getByRole("heading", { name: /Нет в наличии/ }),
    ).toHaveCount(0);

    const pagination = page.getByRole("navigation", {
      name: "Пагинация каталога",
    });
    await expect(
      pagination.getByRole("link", { name: "Страница 2" }),
    ).toHaveAttribute("href", `${basePath}?minPrice=1500&page=2`);

    await pagination.getByRole("link", { name: "Страница 2" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${basePath}\\?minPrice=1500&page=2$`),
    );
    await expect(filter.getByLabel("Цена от")).toHaveValue("1500");

    await filter.getByRole("button", { name: "Сбросить" }).click();
    await expect(page).toHaveURL(new RegExp(`${basePath}$`));
    await expect(filter.getByLabel("Цена от")).toHaveValue("");
  });
}

test("price filter empty state stays on the catalog and can be cleared", async ({
  page,
}) => {
  await page.goto("/tovary?minPrice=9000");

  await expect(
    page.getByText("Нет товаров в выбранном диапазоне цен."),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Фильтр по цене" }),
  ).toBeVisible();

  await page
    .getByRole("form", { name: "Фильтр по цене" })
    .getByRole("button", { name: "Сбросить" })
    .click();
  await expect(page).toHaveURL(/\/tovary$/);
  await expect(page.locator(".product-grid .product-card")).toHaveCount(8);
});

test("invalid catalog price query is not found and page one alias keeps the filter", async ({
  baseURL,
  request,
}) => {
  expect(baseURL).toBeTruthy();

  for (const query of ["minPrice=01", "maxPrice=abc", "minPrice=0"]) {
    const response = await request.get(`/tovary?${query}`);
    expect(response.status(), query).toBe(404);
  }

  const firstPageAlias = await request.get("/tovary?minPrice=1500&page=1", {
    maxRedirects: 0,
  });
  expect(firstPageAlias.status()).toBe(308);
  expect(new URL(firstPageAlias.headers().location!, baseURL).search).toBe(
    "?minPrice=1500",
  );
});
