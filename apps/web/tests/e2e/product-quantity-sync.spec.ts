import { expect, test } from "@playwright/test";

test("product quantity controls update and follow the cart after add", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  const pageQuantity = page.getByRole("group", {
    name: "Количество",
    exact: true,
  });
  const pageOutput = pageQuantity.locator("output");
  const pageIncrease = pageQuantity.getByRole("button", {
    name: "Увеличить количество",
  });
  const pageDecrease = pageQuantity.getByRole("button", {
    name: "Уменьшить количество",
  });
  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.click();

  const dialog = page.getByRole("dialog");
  const cartQuantity = dialog.getByRole("group", {
    name: "Количество Да Хун Пао",
  });
  const cartOutput = cartQuantity.locator("output");
  await expect(cartOutput).toHaveText("1");
  await dialog.getByRole("button", { name: "Закрыть корзину" }).click();

  await pageIncrease.click();
  await expect(pageOutput).toHaveText("2");
  await page.getByRole("button", { name: "В корзине" }).click();
  await expect(cartOutput).toHaveText("2");

  await cartQuantity
    .getByRole("button", { name: "Увеличить количество Да Хун Пао" })
    .click();
  await expect(cartOutput).toHaveText("3");
  await dialog.getByRole("button", { name: "Закрыть корзину" }).click();
  await expect(pageOutput).toHaveText("3");

  await page.reload();
  await expect(page.getByRole("button", { name: "В корзине" })).toHaveAttribute(
    "data-cart-ready",
    "true",
  );
  await expect(pageOutput).toHaveText("3");

  await pageDecrease.click();
  await pageDecrease.click();
  await expect(pageOutput).toHaveText("1");
  await expect(pageDecrease).toBeDisabled();
  await expect(page.getByRole("button", { name: "В корзине" })).toBeEnabled();

  for (let quantity = 1; quantity < 5; quantity += 1) {
    await pageIncrease.click();
  }
  await expect(pageOutput).toHaveText("5");
  await expect(pageIncrease).toBeDisabled();
  await page.getByRole("button", { name: "В корзине" }).click();
  await expect(cartOutput).toHaveText("5");
});
