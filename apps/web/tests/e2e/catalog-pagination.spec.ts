import { expect, test, type Page } from "@playwright/test";

async function expectCanonical(page: Page, path: string) {
  const href = new URL(path, page.url()).toString();
  const canonical = page.locator(`link[rel="canonical"][href="${href}"]`);

  await expect(canonical).toHaveCount(1);
}

test("catalog pagination uses canonical URLs and navigates every boundary", async ({
  page,
}) => {
  await page.goto("/stantsii");

  const grid = page.locator(".product-grid");
  const pagination = page.getByRole("navigation", {
    name: "Пагинация каталога",
  });
  await expect(grid.locator(".product-card")).toHaveCount(8);
  await expect(pagination).toBeVisible();
  await expect(pagination.getByText("Назад", { exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(
    pagination.getByRole("link", { name: "Страница 2" }),
  ).toHaveAttribute("href", "/stantsii?page=2");
  await expectCanonical(page, "/stantsii");

  await pagination.getByRole("link", { name: "Страница 2" }).click();
  await expect(page).toHaveURL(/\/stantsii\?page=2$/);
  await expect(grid.locator(".product-card")).toHaveCount(8);
  await expect(grid.getByRole("heading").first()).toHaveText("Сорт 08");
  await expect(pagination.getByRole("link", { name: "Назад" })).toHaveAttribute(
    "href",
    "/stantsii",
  );
  await expect(
    pagination.getByRole("link", { name: "Вперёд" }),
  ).toHaveAttribute("href", "/stantsii?page=3");
  await expectCanonical(page, "/stantsii?page=2");

  await pagination.getByRole("link", { name: "Страница 3" }).click();
  await expect(page).toHaveURL(/\/stantsii\?page=3$/);
  await expect(grid.locator(".product-card")).toHaveCount(8);
  await expect(grid.getByRole("heading").first()).toHaveText("Сорт 16");
  await expect(grid.getByRole("heading").nth(7)).toHaveText("Нет в наличии 01");

  await pagination.getByRole("link", { name: "Страница 6" }).click();
  await expect(page).toHaveURL(/\/stantsii\?page=6$/);
  await expect(grid.locator(".product-card")).toHaveCount(5);
  await expect(grid.getByRole("heading").first()).toHaveText(
    "Нет в наличии 18",
  );
  await expect(pagination.getByText("Вперёд", { exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

for (const basePath of ["/stantsii", "/paneli"] as const) {
  test(`${basePath} rejects invalid and out-of-range pages and redirects page one`, async ({
    baseURL,
    request,
  }) => {
    expect(baseURL).toBeTruthy();

    const firstPageAlias = await request.get(`${basePath}?page=1`, {
      maxRedirects: 0,
    });
    expect(firstPageAlias.status()).toBe(308);
    expect(new URL(firstPageAlias.headers().location!, baseURL).pathname).toBe(
      basePath,
    );

    for (const query of ["0", "-1", "1.5", "01", "abc", "999"]) {
      const response = await request.get(`${basePath}?page=${query}`);
      expect(response.status(), query).toBe(404);
    }
  });
}

test("rituals use their own landing content, product routes and pagination", async ({
  page,
}) => {
  await page.goto("/paneli");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ритуалы");
  await expect(page.getByText("Готовые чайные сценарии.")).toBeVisible();
  const cards = page.getByRole("main").getByRole("article");
  await expect(cards).toHaveCount(8);
  await expect(cards.first().locator("a")).toHaveAttribute(
    "href",
    /^\/paneli\//,
  );
  await expectCanonical(page, "/paneli");

  await page
    .getByRole("navigation", { name: "Пагинация каталога" })
    .getByRole("link", { name: "Страница 2" })
    .click();
  await expect(page).toHaveURL(/\/paneli\?page=2$/);
  await expectCanonical(page, "/paneli?page=2");
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844, maxWidthRatio: 0.8 },
  { name: "desktop", width: 1440, height: 1000, maxWidthRatio: 0.5 },
] as const) {
  test(`catalog pagination keeps navigation controls grouped on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/stantsii?page=2");

    const pagination = page.getByRole("navigation", {
      name: "Пагинация каталога",
    });
    const previous = pagination.getByRole("link", { name: "Назад" });
    const pages = pagination.getByRole("list");
    const next = pagination.getByRole("link", { name: "Вперёд" });

    await expect(pagination).toBeVisible();
    await expect(previous).toBeVisible();
    await expect(pages).toBeVisible();
    await expect(next).toBeVisible();

    const [paginationBox, previousBox, pagesBox, nextBox] = await Promise.all([
      pagination.boundingBox(),
      previous.boundingBox(),
      pages.boundingBox(),
      next.boundingBox(),
    ]);
    expect(paginationBox).not.toBeNull();
    expect(previousBox).not.toBeNull();
    expect(pagesBox).not.toBeNull();
    expect(nextBox).not.toBeNull();

    const boxes = [previousBox!, pagesBox!, nextBox!];
    const groupLeft = Math.min(...boxes.map((box) => box.x));
    const groupRight = Math.max(...boxes.map((box) => box.x + box.width));
    const groupWidth = groupRight - groupLeft;

    expect(groupWidth).toBeLessThan(
      paginationBox!.width * viewport.maxWidthRatio,
    );
    expect(
      Math.abs(
        groupLeft +
          groupWidth / 2 -
          (paginationBox!.x + paginationBox!.width / 2),
      ),
    ).toBeLessThan(2);
  });
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
] as const) {
  test(`catalog pagination stays inside the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/stantsii?page=2");

    await expect(
      page.getByRole("navigation", { name: "Пагинация каталога" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        })),
      )
      .toEqual({ clientWidth: viewport.width, scrollWidth: viewport.width });
  });
}
