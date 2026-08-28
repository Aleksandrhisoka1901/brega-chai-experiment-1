import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const contactEmail = process.env.E2E_CONTACT_EMAIL ?? "hello@brega.test";

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
      name: "У времени есть вкус.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Небольшая коллекция чая и\u00a0предметов для\u00a0тех моментов, когда спешить больше некуда.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "К ритуалам" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Все ритуалы" })).toHaveAttribute(
    "href",
    "/paneli",
  );
  const about = page.locator("#about");
  await expect(about.locator("p")).toContainText([
    "Глава 01 · О проекте",
    "Мы собираем чай, посуду и\u00a0простые инструкции в\u00a0цельные сценарии — для\u00a0утра, разговора, одиночества или подарка.",
    "Ассортимент короткий намеренно. Здесь не\u00a0нужно сравнивать десятки почти одинаковых позиций.",
  ]);
  await expect(page.getByRole("contentinfo")).toContainText("Brega Tea");
  await expect(page.getByRole("heading", { name: "Контакты" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Правовая информация" }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText(
    `© ${new Date().getFullYear()}. ИП Иванов Иван. ИНН 123456789`,
  );
  await expect(page.getByRole("contentinfo")).not.toContainText(
    "Тестовые реквизиты",
  );
  await expect(page.getByRole("link", { name: contactEmail })).toHaveAttribute(
    "href",
    `mailto:${contactEmail}`,
  );
  const telegramLink = page.getByRole("link", { name: "Telegram" });
  await expect(telegramLink).toHaveAttribute("href", "https://t.me/brega_chai");
  await expect(telegramLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(telegramLink.locator("svg")).toHaveCSS("width", "20px");
  const contactTextLeftEdges = await page
    .locator(".site-footer__contacts a span")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().left),
    );
  expect(new Set(contactTextLeftEdges).size).toBe(1);
  const legalNavigation = page.getByRole("navigation", {
    name: "Юридические документы",
  });
  await expect(legalNavigation).toBeVisible();
  await expect(legalNavigation.getByRole("link")).toHaveCount(3);
  for (const name of [
    "Политика конфиденциальности",
    "Пользовательское соглашение",
    "Условия доставки и возврата",
  ]) {
    await expect(legalNavigation.getByRole("link", { name })).toHaveAttribute(
      "target",
      "_blank",
    );
    await expect(legalNavigation.getByRole("link", { name })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  }
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
