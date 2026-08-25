import { expect, test } from "@playwright/test";

const adminBaseUrl =
  process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:1337/admin";
const adminEmail = process.env.ADMIN_E2E_EMAIL;
const adminPassword = process.env.ADMIN_E2E_PASSWORD;
const isKnownOptionalAdmin404 = (url: string) =>
  [
    "/admin/ai-feature-config",
    "/i18n/ai-localization-jobs/",
    "/content-manager/preview/url/",
  ].some((path) => url.includes(path));
const isKnownStrapiInputControlWarning = (text: string) =>
  text.startsWith(
    "Warning: A component is changing an uncontrolled input to be controlled.",
  );
const isKnownStrapiUpdateCheck = (url: string) =>
  url === "https://api.github.com/repos/strapi/strapi/releases/latest";

test.describe("admin content manager live smoke", () => {
  test.skip(
    process.env.ORDER_ADMIN_E2E_ALLOW !== "local-admin" ||
      !adminEmail ||
      !adminPassword,
    "requires an explicitly allowed local Strapi Admin account",
  );

  test("changed schemas are exposed correctly", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const notFoundResponses: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const sourceUrl = message.location().url;
        if (
          isKnownStrapiInputControlWarning(message.text()) ||
          isKnownStrapiUpdateCheck(sourceUrl)
        ) {
          return;
        }
        if (
          message.text().includes("404") &&
          isKnownOptionalAdmin404(sourceUrl)
        ) {
          return;
        }
        consoleErrors.push(
          sourceUrl ? `${message.text()} (${sourceUrl})` : message.text(),
        );
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      if (
        response.status() === 404 &&
        !isKnownOptionalAdmin404(response.url())
      ) {
        notFoundResponses.push(response.url());
      }
    });

    await page.goto(`${adminBaseUrl}/auth/login`);
    await page
      .getByRole("textbox", { name: /электронная почта|email/i })
      .fill(adminEmail!);
    await page.getByLabel(/пароль|password/i).fill(adminPassword!);
    await page.getByRole("button", { name: /войти|login/i }).click();
    await expect(page).toHaveURL(/\/admin\/?(?:$|\?)/);

    await page.goto(
      `${adminBaseUrl}/content-manager/single-types/api::home-page.home-page`,
    );
    await expect(
      page.getByRole("link", { name: "Главная страница" }),
    ).toBeVisible();
    await expect(page.locator('[name="hero.cta.label"]')).toHaveValue(
      "К ритуалам",
    );
    await expect(page.getByLabel("textBlock1")).toHaveValue(
      /Мы собираем чай, посуду и простые инструкции/,
    );
    await expect(page.getByLabel("textBlock2")).toHaveValue(
      /Ассортимент короткий намеренно/,
    );
    await expect(page.locator('[name="about.image"]')).toHaveCount(0);
    await expect(page.locator('[name="naboryPreview.linkLabel"]')).toHaveValue(
      "Все ритуалы",
    );
    await expect(page.locator('[name="tovaryPreview.linkLabel"]')).toHaveValue(
      "Все сорта",
    );
    const colorPickers = page.getByRole("button", {
      name: "Color picker toggle",
    });
    await expect(colorPickers).toHaveCount(4);
    for (const heroColorPicker of [colorPickers.nth(0), colorPickers.nth(1)]) {
      await expect(heroColorPicker).toHaveText("");
      await expect(heroColorPicker.locator("[color]")).toHaveAttribute(
        "color",
        "",
      );
    }

    const singleTypeTransitions = [
      {
        label: "Общие настройки",
        uid: "api::global-setting.global-setting",
        readyField: '[name="brandName"]',
      },
      {
        label: "Страница сортов",
        uid: "api::products-page.products-page",
        readyField: '[name="title"]',
      },
      {
        label: "Страница ритуалов",
        uid: "api::rituals-page.rituals-page",
        readyField: '[name="title"]',
      },
      {
        label: "Страница статей",
        uid: "api::articles-page.articles-page",
        readyField: '[name="title"]',
      },
      {
        label: "Главная страница",
        uid: "api::home-page.home-page",
        readyField: '[name="hero.cta.label"]',
      },
    ] as const;

    for (let transition = 0; transition < 30; transition += 1) {
      const target =
        singleTypeTransitions[transition % singleTypeTransitions.length]!;

      await page.getByRole("link", { name: target.label, exact: true }).click();
      await expect(page).toHaveURL(
        `${adminBaseUrl}/content-manager/single-types/${target.uid}`,
      );
      await expect(page.locator(target.readyField)).toBeVisible();
      await expect(
        page.getByText(
          "Cannot read properties of undefined (reading 'attributes')",
        ),
      ).toHaveCount(0);
    }

    await page
      .getByRole("link", { name: "Страница сортов", exact: true })
      .click();
    await expect(page.locator('textarea[name="intro"]')).toBeVisible();
    await expect(page.locator('[name="image"]')).toHaveCount(0);

    await page.goto(
      `${adminBaseUrl}/content-manager/collection-types/api::product.product`,
    );
    const productGrid = page.getByRole("grid");
    await expect(productGrid).toBeVisible();
    await expect(productGrid.getByText("title", { exact: true })).toBeVisible();
    await expect(
      productGrid.getByText("displayName", { exact: true }),
    ).toBeVisible();
    await expect(
      productGrid
        .getByRole("row")
        .nth(1)
        .getByText(/^Ритуал:|^Сорт:/),
    ).toBeVisible();
    await productGrid.getByRole("row").nth(1).click();
    await expect(page.locator('input[name="title"]')).toBeEditable();
    await expect(page.locator('input[name="displayName"]')).toBeEditable();

    await page.goto(
      `${adminBaseUrl}/content-manager/collection-types/api::order.order`,
    );
    const orderGrid = page.getByRole("grid");
    await expect(orderGrid).toBeVisible();
    await orderGrid.getByRole("row").nth(1).click();
    const orderFields = page.locator("main input, main textarea");
    await expect(orderFields.first()).toBeVisible();
    for (const field of await orderFields.all()) {
      await expect(field).toBeDisabled();
    }

    expect(consoleErrors, consoleErrors.join("\n")).toHaveLength(0);
    expect(pageErrors, pageErrors.join("\n")).toHaveLength(0);
    expect(notFoundResponses, notFoundResponses.join("\n")).toHaveLength(0);
  });
});
