import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const expectNoAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.html),
  }));

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
};

test("unknown public route renders an honest accessible 404 @a11y", async ({
  page,
}) => {
  const response = await page.goto("/route-that-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Такой страницы нет", level: 1 }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("link", { name: "Вернуться на главную" }),
  ).toHaveAttribute("href", "/");
  await expectNoAxeViolations(page);

  await page.getByRole("link", { name: "Вернуться на главную" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});

test("service unavailable route cannot be opened directly", async ({
  page,
}) => {
  const response = await page.goto("/service-unavailable-internal");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Такой страницы нет", level: 1 }),
  ).toBeVisible();
});

test("service unavailable state is accessible and actionable @a11y", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({
    "x-brega-service-unavailable": "1",
  });
  const response = await page.goto("/service-unavailable-internal");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: "Сайт ненадолго остановился",
      level: 1,
    }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await expect(
    page.getByRole("link", { name: "Вернуться на главную" }),
  ).toBeVisible();
});
