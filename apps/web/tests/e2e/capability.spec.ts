import { expect, test } from "@playwright/test";

test("/tipovye-resheniya shows the comparison table and inquiry form", async ({
  page,
}) => {
  await page.goto("/tipovye-resheniya");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Коммерческая и промышленная система хранения энергии",
    }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "FP115KWH" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("FP115KWH");
  await expect(page.getByRole("table")).not.toContainText("₽");
  const navigation = page.getByRole("navigation", {
    name: "Основная навигация",
  });
  await expect(
    navigation.getByRole("link", { name: "Системы хранения энергии" }),
  ).toHaveAttribute("href", "/tipovye-resheniya");
  await expect(navigation.getByRole("link").last()).toHaveAttribute(
    "href",
    "/stati",
  );
  const form = page.locator("[data-inquiry-form]");
  await expect(form).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await form.getByRole("button", { name: "Оставить заявку" }).click();
  await expect(page.getByLabel("Какая система интересует")).toBeFocused();
  await expect(page.getByLabel("Email")).toBeVisible();
});
