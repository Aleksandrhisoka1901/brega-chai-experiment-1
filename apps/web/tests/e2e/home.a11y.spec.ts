import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage smoke and accessibility @smoke @a11y", async ({ page }) => {
  const consoleErrors: string[] = [];
  const remoteFontRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) {
      remoteFontRequests.push(request.url());
    }
  });

  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Чай как ежедневный ритуал",
    }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Brega Chai");
  await expect(
    page.getByRole("link", { name: "hello@brega.test" }),
  ).toHaveAttribute("href", "mailto:hello@brega.test");
  await expect(page.getByRole("link", { name: "Telegram" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(
    page.getByRole("navigation", { name: "Юридические документы" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        display: document.fonts.check('16px "Cormorant Garamond"', "Чай"),
        interface: document.fonts.check("16px Manrope", "Корзина"),
      })),
    )
    .toEqual({ display: true, interface: true });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(remoteFontRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
