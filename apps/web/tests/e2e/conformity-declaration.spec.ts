import { expect, test } from "@playwright/test";

test("/legal/deklaraciya-sootvetstviya renders the CMS legal copy", async ({
  page,
}) => {
  await page.goto("/legal/deklaraciya-sootvetstviya");
  await expect(
    page.getByRole("heading", { level: 1, name: "Декларация соответствия" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "hello@lon-energy.ru" })).toHaveAttribute(
    "href",
    "mailto:hello@lon-energy.ru",
  );
  await expect(
    page.getByRole("link", { name: "Вернуться на главную" }),
  ).toHaveAttribute("href", "/");
});
