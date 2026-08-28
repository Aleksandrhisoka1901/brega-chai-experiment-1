import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const catalog of [
  { path: "/stantsii", title: "Сорта", eyebrow: "Глава 03" },
  { path: "/paneli", title: "Ритуалы", eyebrow: "Глава 02" },
] as const) {
  test(`${catalog.path} stays compact, continuous, and accessible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(catalog.path);

    const breadcrumbs = page.getByRole("navigation", {
      name: "Хлебные крошки",
    });
    await expect(
      breadcrumbs.getByRole("link", { name: "Главная" }),
    ).toBeVisible();
    await expect(breadcrumbs.getByText(catalog.title)).toHaveAttribute(
      "aria-current",
      "page",
    );

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: catalog.title,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(catalog.eyebrow, { exact: true }),
    ).toBeVisible();

    const productGrid = page.locator(".product-grid");
    await expect(productGrid.getByRole("article")).toHaveCount(8);
    await expect(
      page.getByRole("form", { name: "Фильтр по цене" }),
    ).toBeVisible();
    await expect(productGrid).toHaveCSS("gap", "0px");
    await expect(productGrid).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const gridBox = await productGrid.boundingBox();
    expect(gridBox?.y).toBeLessThan(620);
    const wordmarkBox = await page
      .getByRole("link", { name: "Brega Tea — главная" })
      .boundingBox();
    expect(Math.abs((wordmarkBox?.x ?? 0) - (gridBox?.x ?? 0))).toBeLessThan(2);

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "К содержимому" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("catalog title fills optional eyebrow space", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/stantsii");

  const intro = page.locator(".catalog-intro");
  const eyebrow = page.getByText("Глава 03", { exact: true });
  const title = page.getByRole("heading", { level: 1, name: "Сорта" });
  const eyebrowBox = await eyebrow.boundingBox();

  await eyebrow.evaluate((element) => element.remove());
  await intro.evaluate((element) =>
    element.setAttribute("data-has-eyebrow", "false"),
  );

  const desktopTitleBox = await title.boundingBox();
  expect(desktopTitleBox?.x).toBeCloseTo(eyebrowBox?.x ?? 0, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(title).toHaveCSS("margin-top", "0px");
});
