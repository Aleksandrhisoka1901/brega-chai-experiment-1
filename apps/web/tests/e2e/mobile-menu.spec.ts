import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const contactEmail = process.env.E2E_CONTACT_EMAIL ?? "hello@brega.test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile menu exposes navigation and restores focus", async ({ page }) => {
  await page.goto("/tovary");

  const trigger = page.locator("[data-mobile-menu-trigger]");
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAccessibleName("Открыть меню");
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }),
  ).toBeHidden();

  await trigger.focus();
  await page.keyboard.press("Enter");

  const menu = page.getByRole("dialog", { name: "Меню" });
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("link", { name: "Сорта" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(menu.getByRole("link", { name: contactEmail })).toHaveAttribute(
    "href",
    `mailto:${contactEmail}`,
  );
  await expect(menu.getByRole("link", { name: "Telegram" })).toHaveAttribute(
    "href",
    "https://t.me/brega_chai",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator("[data-mobile-menu]")).toHaveAttribute(
    "data-state",
    "closed",
  );
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile navigation closes after choosing a link", async ({ page }) => {
  await page.goto("/tovary");
  const trigger = page.getByRole("button", { name: "Открыть меню" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const menu = page.getByRole("dialog", { name: "Меню" });
  const close = menu.getByRole("button", { name: "Закрыть меню" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");

  const about = menu.getByRole("link", { name: "О проекте" });
  await expect(about).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/#about$/);
  await expect(page.getByRole("dialog", { name: "Меню" })).toBeHidden();
});

test("open mobile menu has no detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть меню" }).click();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
