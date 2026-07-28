import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function addProductAndOpenCheckout(page: Page) {
  await page.goto("/products/published-product");
  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Оформление" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Отправить заявку" }),
  ).toBeEnabled();
  return dialog;
}

async function fillValidCheckout(page: Page, comment = "") {
  await page.getByLabel("Имя").fill("Анна");
  await page.getByLabel("Телефон").fill("8 (999) 123-45-67");
  await page
    .getByLabel("Адрес доставки")
    .fill("Москва, ул. Чайная, д. 1, кв. 2");
  if (comment) {
    await page.getByLabel("Комментарий (необязательно)").fill(comment);
  }
  await page.getByLabel("Согласен на обработку персональных данных").check();
  await page.getByLabel("Принимаю условия продажи и доставки").check();
}

test.beforeEach(async ({ request }) => {
  await request.delete("http://127.0.0.1:14338/__test/orders-count");
});

test("product → cart → validation → confirmed checkout success @smoke", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCheckout(page);

  await dialog.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(dialog.getByText("Проверьте заполнение формы")).toBeVisible();
  await expect(page.getByLabel("Имя")).toBeFocused();

  await fillValidCheckout(page);
  await dialog.getByRole("button", { name: "Отправить заявку" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Спасибо, заявка принята" }),
  ).toBeVisible();
  await expect(dialog.getByText("Заказ № E2E-0001")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("brega-chai:cart:v1");
        return raw ? JSON.parse(raw).items.length : 0;
      }),
    )
    .toBe(0);
});

test("submit error preserves cart", async ({ page }) => {
  const dialog = await addProductAndOpenCheckout(page);
  await fillValidCheckout(page, "TRIGGER_ERROR");
  await dialog.getByRole("button", { name: "Отправить заявку" }).click();

  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Не удалось создать заявку",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("brega-chai:cart:v1");
      return raw ? JSON.parse(raw).items.length : 0;
    }),
  ).toBe(1);
});

test("double click creates one upstream request", async ({ page, request }) => {
  const dialog = await addProductAndOpenCheckout(page);
  await fillValidCheckout(page, "DOUBLE_CLICK");
  const submit = dialog.getByRole("button", { name: "Отправить заявку" });

  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(
    dialog.getByRole("heading", { name: "Спасибо, заявка принята" }),
  ).toBeVisible();

  const count = await (
    await request.get("http://127.0.0.1:14338/__test/orders-count")
  ).json();
  expect(count.count).toBe(1);
});

test("drawer and checkout are keyboard-operable and axe-clean @a11y", async ({
  page,
}) => {
  await page.goto("/products/published-product");
  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);

  const checkout = dialog.getByRole("button", {
    name: "Перейти к оформлению",
  });
  await checkout.focus();
  await page.keyboard.press("Enter");
  await expect(
    dialog.getByRole("heading", { name: "Оформление" }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);

  const close = dialog.getByRole("button", { name: "Закрыть корзину" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "В корзине" })).toBeFocused();
});
