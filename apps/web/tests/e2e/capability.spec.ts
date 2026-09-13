import { expect, test } from "@playwright/test";

test("/tipovye-resheniya shows the comparison table and inquiry form", async ({
  page,
}) => {
  await page.goto("/tipovye-resheniya");
  await expect(
    page.getByRole("heading", { level: 1, name: "Типовые аккумуляторные системы" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("FP115KWH");
  await expect(page.getByRole("table")).not.toContainText("₽");
  const navigation = page.getByRole("navigation", {
    name: "Основная навигация",
  });
  await expect(
    navigation.getByRole("link", { name: "Типовые решения" }),
  ).toHaveAttribute("href", "/tipovye-resheniya");
  await expect(navigation.getByRole("link").last()).toHaveAttribute(
    "href",
    "/stati",
  );
  await expect(page.locator("[data-inquiry-form]")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Хотите узнать подробности?" }),
  ).toBeVisible();
});
