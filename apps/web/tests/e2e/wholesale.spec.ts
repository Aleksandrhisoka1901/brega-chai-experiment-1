import { expect, test } from "@playwright/test";

test("/dlya-optovikov renders the wholesale landing", async ({ page }) => {
  await page.goto("/dlya-optovikov");
  await expect(
    page.getByRole("heading", { level: 1, name: "Для оптовиков" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }).getByRole(
      "link",
      { name: "Для оптовиков" },
    ),
  ).toHaveAttribute("href", "/dlya-optovikov");
});

test("homepage wholesale band links to the wholesale page", async ({
  page,
}) => {
  await page.goto("/");
  const band = page.locator("#opt");
  await expect(
    band.getByRole("heading", { level: 2, name: "Для оптовиков" }),
  ).toBeVisible();
  await band.getByRole("link", { name: "Условия для опта" }).click();
  await expect(page).toHaveURL(/\/dlya-optovikov$/);
});
