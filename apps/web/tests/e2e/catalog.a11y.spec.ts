import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("catalog unavailable state stays navigable and accessible", async ({
  page,
}) => {
  await page.goto("/products");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Чай, выбранный для внимания",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").getByText("Каталог временно недоступен."),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К содержимому" })).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
