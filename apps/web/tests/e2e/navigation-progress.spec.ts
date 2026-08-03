import { expect, test } from "@playwright/test";

test("shows delayed progress for a slow internal route", async ({ page }) => {
  await page.goto("/");
  await page.route("**/tovary?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  });

  await page.getByRole("link", { name: "Сорта", exact: true }).first().click();

  const progress = page.locator("[data-navigation-progress]");
  await expect(progress).toHaveAttribute("data-active", "true");
  await expect(page).toHaveURL(/\/tovary$/);
  await expect(progress).toHaveAttribute("data-active", "false");
});

test("does not show progress for a same-page hash link", async ({ page }) => {
  await page.goto("/");
  const progress = page.locator("[data-navigation-progress]");

  await page
    .getByRole("link", { name: "О проекте", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/#about$/);
  await expect(progress).toHaveAttribute("data-active", "false");
});
