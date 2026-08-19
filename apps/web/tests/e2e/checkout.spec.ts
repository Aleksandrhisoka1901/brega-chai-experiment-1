import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
const cmsFixturePort = process.env.CMS_FIXTURE_PORT ?? "14338";

async function addProductAndOpenCart(page: Page, slug = "published-product") {
  await page.goto(`/tovary/${slug}`);
  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await expect(dialog).toHaveCSS("width", "460px");
  await expect(dialog).toHaveCSS("border-left-width", "1px");
  await expect(dialog).toHaveCSS("box-shadow", "none");
  const removeButton = dialog.getByRole("button", {
    name: /Удалить .+ из корзины/,
  });
  await expect(removeButton).toHaveCSS("width", "44px");
  const removeIcon = removeButton.locator("svg");
  await expect(removeIcon).toHaveCount(1);
  await expect(removeIcon).toHaveCSS("width", "20px");
  return dialog;
}

async function addProductAndOpenCheckout(
  page: Page,
  slug = "published-product",
) {
  const dialog = await addProductAndOpenCart(page, slug);
  await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Оформление" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Подтвердить заказ" }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("radio", { name: /Самовывоз/ }),
  ).not.toBeChecked();
  await expect(dialog.getByText("Скидка 10%", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: /^Доставка/ }),
  ).not.toBeChecked();
  await expect(dialog.getByLabel("ФИО")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Назад к корзине" }),
  ).toHaveCSS("margin-bottom", "24px");
  await expect(dialog.locator("form").locator("..")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  return dialog;
}

async function fillValidCheckout(page: Page, comment = "") {
  await page.getByRole("radio", { name: /^Доставка/ }).check();
  await page.getByLabel("ФИО").fill("Анна");
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
  await request.delete(
    `http://127.0.0.1:${cmsFixturePort}/__test/orders-count`,
  );
});

test("cart and checkout money use compact interface typography", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCart(page);
  const linePrice = dialog.locator('[data-money="line"]');
  const cartTotal = dialog.locator('[data-money="total"]');

  await expect(linePrice).toHaveText("1 600 ₽");
  await expect(cartTotal).toHaveText("1 600 ₽");
  for (const amount of [linePrice, cartTotal]) {
    await expect(amount).toHaveCSS("font-family", /Manrope/);
    await expect(amount).toHaveCSS("font-weight", "500");
    await expect(amount).toHaveCSS("font-variant-numeric", "tabular-nums");
    await expect(amount).toHaveCSS("white-space", "nowrap");
  }
  await expect(linePrice).toHaveCSS("font-size", "16px");
  await expect(cartTotal).toHaveCSS("font-size", "24px");

  await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
  await dialog.getByRole("radio", { name: /Самовывоз/ }).check();

  const previousTotal = dialog.locator('[data-money="previous-total"]');
  const discountedTotal = dialog.locator('[data-money="total"]');
  await expect(previousTotal).toHaveText("1 600 ₽");
  await expect(discountedTotal).toHaveText("1 440 ₽");
  await expect(previousTotal).toHaveCSS("font-family", /Manrope/);
  await expect(previousTotal).toHaveCSS("font-size", "16px");
  await expect(previousTotal).toHaveCSS("text-decoration-line", "line-through");
  await expect(discountedTotal).toHaveCSS("font-family", /Manrope/);
  await expect(discountedTotal).toHaveCSS("font-size", "24px");
});

test("product → cart → validation → confirmed checkout success @smoke", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCheckout(page);
  const pickup = page.getByRole("radio", { name: /Самовывоз/ });
  const courier = page.getByRole("radio", { name: /^Доставка/ });

  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(pickup).toBeFocused();
  await expect(dialog.getByText("Выберите способ получения")).toBeVisible();

  await courier.check();
  const name = page.getByLabel("ФИО");
  const phone = page.getByLabel("Телефон");
  const email = page.getByLabel("Email (необязательно)");
  const address = page.getByLabel("Адрес доставки");

  await expect(name).toHaveAttribute("autocomplete", "name");
  await expect(phone).toHaveAttribute("autocomplete", "tel");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(address).toHaveAttribute("autocomplete", "street-address");
  await expect(phone).toHaveAttribute("placeholder", "+7 (XXX) XXX-XX-XX");
  await phone.focus();
  await expect(phone).toHaveAttribute("placeholder", "+7 (___) ___-__-__");
  await expect(phone).toHaveValue("+7 (___) ___-__-__");
  await phone.press("7");
  await expect(phone).toHaveValue("+7 (___) ___-__-__");
  await expect
    .poll(() =>
      phone.evaluate((input) => (input as HTMLInputElement).selectionStart),
    )
    .toBe(4);
  await phone.selectText();
  await phone.press("Backspace");
  await expect(phone).toHaveValue("+7 (___) ___-__-__");
  await phone.press("9");
  await expect(phone).toHaveValue("+7 (9__) ___-__-__");
  await phone.selectText();
  await phone.press("Delete");
  await expect(phone).toHaveValue("+7 (___) ___-__-__");
  await phone.press("8");
  await expect(phone).toHaveValue("+7 (___) ___-__-__");
  await phone.selectText();
  await phone.press("Backspace");
  await phone.fill("8 (999) 123-45-67");
  await expect(phone).toHaveValue("+7 (999) 123-45-67");
  await phone.press("Backspace");
  await expect(phone).toHaveValue("+7 (999) 123-45-6_");
  await phone.fill("");

  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(dialog.getByText("Проверьте заполнение формы")).toHaveCount(0);
  await expect(dialog.getByText("Укажите ФИО")).toBeVisible();
  await expect(name).toHaveCSS("border-color", "rgb(184, 61, 47)");
  expect(
    await page
      .getByLabel("Согласен на обработку персональных данных")
      .evaluate((input) => getComputedStyle(input.parentElement!).alignItems),
  ).toBe("center");
  await expect(name).toBeFocused();

  const comment = page.getByLabel("Комментарий (необязательно)");
  await expect(comment).toHaveAttribute("maxlength", "1000");
  await expect(comment.locator("..").getByText("0/1000")).toBeVisible();
  const initialCommentHeight = await comment.evaluate(
    (textarea) => textarea.getBoundingClientRect().height,
  );
  const commentValue = "Первая строка\nВторая строка\nТретья строка\nЧетвёртая";
  await comment.fill(commentValue);
  await expect(
    comment.locator("..").getByText(`${commentValue.length}/1000`),
  ).toBeVisible();
  await expect
    .poll(() =>
      comment.evaluate((textarea) => textarea.getBoundingClientRect().height),
    )
    .toBeGreaterThan(initialCommentHeight);

  await fillValidCheckout(page);
  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Спасибо, заказ принят" }),
  ).toBeVisible();
  await expect(dialog.getByText("Номер заказа")).toBeVisible();
  await expect(dialog.getByText("2607-0001")).toBeVisible();
  await expect(dialog.getByText("Заявка принята.")).toHaveCount(0);
  await expect(
    dialog.getByText(
      "Менеджер свяжется с вами, чтобы подтвердить наличие и согласовать оплату.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("brega-chai:cart:v1");
      return raw ? JSON.parse(raw).items.length : 0;
    }),
  ).toBe(1);

  await dialog.getByRole("button", { name: "Вернуться к покупкам" }).click();
  await expect(page.locator("[data-cart-drawer]")).toHaveAttribute(
    "data-state",
    "closed",
  );
  await expect(dialog).toBeHidden();
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
  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();

  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Не удалось создать заказ",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("brega-chai:cart:v1");
      return raw ? JSON.parse(raw).items.length : 0;
    }),
  ).toBe(1);
});

test("stock conflict shows an availability message and preserves cart", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCheckout(page);
  await fillValidCheckout(page, "TRIGGER_STOCK");
  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();

  await expect(
    dialog.getByRole("alert").filter({
      hasText:
        "Некоторых товаров уже нет в нужном количестве. Проверьте корзину.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("brega-chai:cart:v1");
      return raw ? JSON.parse(raw).items.length : 0;
    }),
  ).toBe(1);
});

test("refreshes live stock before opening checkout", async ({
  page,
  request,
}) => {
  const dialog = await addProductAndOpenCart(page);
  await request.put(
    `http://127.0.0.1:${cmsFixturePort}/__test/stock?slug=published-product&stock=0`,
  );

  await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();

  await expect(dialog.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Остатки изменились. Проверьте позиции в корзине.",
    }),
  ).toBeVisible();
  await expect(dialog.getByText("Товар закончился.")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Перейти к оформлению" }),
  ).toBeDisabled();
});

test("updates product availability after success without page navigation", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCheckout(page, "last-product");
  await fillValidCheckout(page);
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });

  await dialog.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Спасибо, заказ принят" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Вернуться к покупкам" }).click();

  await expect(page).toHaveURL(/\/tovary\/last-product$/);
  await expect(
    page.getByRole("button", { name: "Нет в наличии" }),
  ).toBeDisabled();
  expect(navigations).toBe(0);
});

test("double click creates one upstream request", async ({ page, request }) => {
  const dialog = await addProductAndOpenCheckout(page);
  await fillValidCheckout(page, "DOUBLE_CLICK");
  const submit = dialog.getByRole("button", { name: "Подтвердить заказ" });

  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(
    dialog.getByRole("heading", { name: "Спасибо, заказ принят" }),
  ).toBeVisible();

  const count = await (
    await request.get(`http://127.0.0.1:${cmsFixturePort}/__test/orders-count`)
  ).json();
  expect(count.count).toBe(1);
});

test("drawer and checkout are keyboard-operable and axe-clean @a11y", async ({
  page,
}) => {
  await page.goto("/tovary/published-product");
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

  const submit = dialog.getByRole("button", { name: "Подтвердить заказ" });
  await expect(submit).toBeEnabled();
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("radio", { name: /Самовывоз/ })).toBeFocused();
  await expect(
    dialog.getByRole("radiogroup", { name: "Способ получения" }),
  ).toHaveAttribute("aria-invalid", "true");

  const close = dialog.getByRole("button", { name: "Закрыть корзину" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-cart-drawer]")).toHaveAttribute(
    "data-state",
    "closed",
  );
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "В корзине" })).toBeFocused();
});

test("pickup shows CMS address and discounted total without address input", async ({
  page,
}) => {
  const dialog = await addProductAndOpenCheckout(page);
  await page.getByRole("radio", { name: /Самовывоз/ }).check();

  await expect(dialog.getByText(/г\. Москва, ул\. Чайная/)).toBeVisible();
  await expect(page.getByLabel("Адрес доставки")).toHaveCount(0);
  await expect(dialog.getByText("Со скидкой за самовывоз")).toBeVisible();
  await expect(
    dialog.getByText(/Скидка 10% будет зафиксирована/),
  ).toBeVisible();
});

test("cart scroll shadows track remaining overflowing content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "brega-chai:cart:v1",
      JSON.stringify({
        version: 1,
        items: Array.from({ length: 5 }, (_, index) => ({
          productId: `scroll-shadow-${index}`,
          slug: `scroll-shadow-${index}`,
          type: "tovar",
          title: `Чай для проверки ${index + 1}`,
          packageLabel: "Пакетик (50 г)",
          unitPriceSnapshot: 1600,
          currency: "RUB",
          image: { url: "/favicon.ico", alt: "Пачка чая" },
          quantity: 1,
        })),
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Открыть корзину/ }).click();

  const dialog = page.getByRole("dialog");
  const scroller = dialog.locator("ul").locator("..");
  await expect(scroller).toHaveAttribute("data-scrollable", "true");
  await expect(scroller).not.toHaveAttribute("data-scrolled", "true");
  await expect(scroller).toHaveAttribute("data-scroll-below", "true");
  await expect(scroller).not.toHaveCSS("box-shadow", "none");

  await scroller.evaluate((element) => {
    element.scrollTop = 100;
  });
  await expect(scroller).toHaveAttribute("data-scrolled", "true");
  await expect(scroller).toHaveAttribute("data-scroll-below", "true");
  await expect(scroller).not.toHaveCSS("box-shadow", "none");

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(scroller).toHaveAttribute("data-scrolled", "true");
  await expect(scroller).not.toHaveAttribute("data-scroll-below", "true");
  await expect(scroller).not.toHaveCSS("box-shadow", "none");
});
