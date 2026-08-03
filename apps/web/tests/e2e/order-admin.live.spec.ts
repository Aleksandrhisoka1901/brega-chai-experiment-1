import { expect, test } from "@playwright/test";

const adminBaseUrl =
  process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:1337/admin";
const adminEmail = process.env.ADMIN_E2E_EMAIL;
const adminPassword = process.env.ADMIN_E2E_PASSWORD;
const editCycles = Math.max(1, Number(process.env.ORDER_ADMIN_E2E_CYCLES ?? 1));

test.describe("order admin live flow", () => {
  test.skip(
    process.env.ORDER_ADMIN_E2E_ALLOW !== "local-admin" ||
      !adminEmail ||
      !adminPassword,
    "requires an explicitly allowed local Strapi Admin account",
  );

  test("manager edits an order and restores its original values", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${adminBaseUrl}/auth/login`);
    await page
      .getByRole("textbox", { name: /электронная почта|email/i })
      .fill(adminEmail!);
    await page.getByLabel(/пароль|password/i).fill(adminPassword!);
    await page.getByRole("button", { name: /войти|login/i }).click();
    await expect(page).toHaveURL(/\/admin\/?(?:$|\?)/);

    await page.goto(`${adminBaseUrl}/plugins/order-admin`);
    await expect(page.getByRole("heading", { name: "Заказы" })).toBeVisible();

    const firstOrder = page.getByRole("grid").getByRole("link").first();
    await expect(firstOrder).toBeVisible();
    await firstOrder.click();
    await expect(page.getByRole("heading", { name: /Заказ / })).toBeVisible();

    const dialog = page.getByRole("dialog", {
      name: /Редактировать заказ/,
    });
    const formatRubles = (value: number) =>
      `${new Intl.NumberFormat("ru-RU").format(value)}\u00a0₽`;

    for (let cycle = 1; cycle <= editCycles; cycle += 1) {
      await page.getByRole("button", { name: "Редактировать заказ" }).click();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Состав заказа")).toBeVisible();
      await expect(dialog.getByLabel("Адрес получения")).toBeEditable();
      await expect(dialog.getByLabel("Комментарий менеджера")).toBeEditable();
      await expect(
        dialog.getByRole("button", { name: "Сохранить изменения" }),
      ).toBeEnabled();

      const address = dialog.getByLabel("Адрес получения");
      const managerComment = dialog.getByLabel("Комментарий менеджера");
      const quantity = dialog.getByLabel(/Количество:/).first();
      const originalAddress = await address.inputValue();
      const originalManagerComment = await managerComment.inputValue();
      const originalQuantity = Number(await quantity.inputValue());
      const stockHint = await dialog
        .getByText(/На складе ещё/)
        .first()
        .textContent();
      const availableStock = Number(stockHint?.match(/\d+/)?.[0] ?? 0);
      const changedQuantity =
        originalQuantity < 5 && availableStock > 0
          ? originalQuantity + 1
          : originalQuantity - 1;
      expect(changedQuantity).toBeGreaterThan(0);

      const itemRow = dialog.getByRole("row").nth(1);
      const unitPriceText = await itemRow
        .getByRole("gridcell")
        .nth(2)
        .textContent();
      const unitPriceRubles = Number(unitPriceText?.replace(/\D/g, ""));
      const testAddress = `${originalAddress} · Playwright ${cycle}`;
      const testManagerComment = `Playwright: проверка редактирования ${cycle}`;

      let changedOrderWasSaved = false;
      try {
        await quantity.fill(String(changedQuantity));
        await address.fill(testAddress);
        await managerComment.fill(testManagerComment);
        await expect(
          dialog.getByText(
            `Итого: ${formatRubles(unitPriceRubles * changedQuantity)}`,
            { exact: true },
          ),
        ).toBeVisible();

        const saveResponse = page.waitForResponse(
          (response) =>
            response.request().method() === "PUT" &&
            /\/order-admin\/orders\/[a-zA-Z0-9_-]+$/.test(response.url()),
        );
        await dialog
          .getByRole("button", { name: "Сохранить изменения" })
          .click();
        expect((await saveResponse).status()).toBe(200);
        changedOrderWasSaved = true;
        await expect(dialog).toBeHidden();
        await expect(
          page.getByText(testAddress, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(testManagerComment, { exact: true }),
        ).toBeVisible();
      } finally {
        if (changedOrderWasSaved) {
          await page
            .getByRole("button", { name: "Редактировать заказ" })
            .click();
          await expect(dialog).toBeVisible();
          await dialog
            .getByLabel(/Количество:/)
            .first()
            .fill(String(originalQuantity));
          await dialog.getByLabel("Адрес получения").fill(originalAddress);
          await dialog
            .getByLabel("Комментарий менеджера")
            .fill(originalManagerComment);
          const restoreResponse = page.waitForResponse(
            (response) =>
              response.request().method() === "PUT" &&
              /\/order-admin\/orders\/[a-zA-Z0-9_-]+$/.test(response.url()),
          );
          await dialog
            .getByRole("button", { name: "Сохранить изменения" })
            .click();
          expect((await restoreResponse).status()).toBe(200);
          await expect(dialog).toBeHidden();
        }
      }
    }

    expect(consoleErrors, consoleErrors.join("\n")).toHaveLength(0);
    expect(pageErrors, pageErrors.join("\n")).toHaveLength(0);
  });
});
