import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CONSENT_STORAGE_KEY = "brega.analytics-consent.v1";
const METRIKA_COUNTER_ID = 112496290;
const METRIKA_SCRIPT_URL = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_COUNTER_ID}`;
const METRIKA_WATCH_URL = `https://mc.yandex.ru/watch/${METRIKA_COUNTER_ID}`;
const METRIKA_INIT_OPTIONS = {
  ssr: true,
  webvisor: true,
  clickmap: true,
  ecommerce: "dataLayer",
  accurateTrackBounce: true,
  trackLinks: true,
};

test.describe("analytics consent", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps the banner optional while Metrika is present in HTML for Yandex", async ({
    page,
  }) => {
    await page.route("https://mc.yandex.ru/**", async (route) => {
      await route.fulfill({
        body: "",
        contentType: "application/javascript",
        status: 200,
      });
    });

    await page.goto("/");

    const html = await page.content();
    expect(html).toContain(METRIKA_SCRIPT_URL);
    expect(html).toContain(METRIKA_WATCH_URL);
    expect(html).toContain(String(METRIKA_COUNTER_ID));

    const consent = page.locator("[data-analytics-consent]");
    await expect(consent).toBeVisible();
    await expect(consent).toContainText("аналитические сервисы");
    await expect(consent).not.toContainText("Яндекс");
    await expect(
      consent.getByRole("link", { name: "Подробнее" }),
    ).toHaveAttribute("href", "/legal/privacy.pdf");
    const accessibility = await new AxeBuilder({ page })
      .include("[data-analytics-consent]")
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await consent.getByRole("button", { name: "Отклонить" }).click();

    await expect(consent).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("rejected");
    expect(await page.content()).toContain(METRIKA_SCRIPT_URL);

    await page.reload();

    await expect(consent).toBeHidden();
    expect(await page.content()).toContain(METRIKA_SCRIPT_URL);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("rejected");
  });

  test("loads counter 112496290 in the initial HTML and keeps the cookie choice", async ({
    page,
  }) => {
    const metrikaRequests: string[] = [];
    await page.route(METRIKA_SCRIPT_URL, async (route) => {
      metrikaRequests.push(route.request().url());
      await route.fulfill({
        body: "",
        contentType: "application/javascript",
        status: 200,
      });
    });
    const scriptRequest = page.waitForRequest(METRIKA_SCRIPT_URL);
    await page.goto("/");
    await scriptRequest;

    const consent = page.locator("[data-analytics-consent]");
    await expect(consent).toBeVisible();
    expect(await page.content()).toContain(METRIKA_SCRIPT_URL);
    await expect
      .poll(() =>
        page.evaluate(
          (counterId) =>
            window.ym?.a?.find(
              (command) => command[0] === counterId && command[1] === "init",
            ),
          METRIKA_COUNTER_ID,
        ),
      )
      .toMatchObject([
        METRIKA_COUNTER_ID,
        "init",
        {
          ...METRIKA_INIT_OPTIONS,
          referrer: expect.any(String),
          url: expect.stringContaining("http://"),
        },
      ]);
    expect(metrikaRequests).toEqual([METRIKA_SCRIPT_URL]);
    expect(await page.evaluate(() => Array.isArray(window.dataLayer))).toBe(
      true,
    );

    await consent.getByRole("button", { name: "Принять" }).click();

    await expect(consent).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("accepted");

    const persistedScriptRequest = page.waitForRequest(METRIKA_SCRIPT_URL);
    await page.reload();
    await persistedScriptRequest;

    await expect(consent).toBeHidden();
    expect(await page.content()).toContain(METRIKA_SCRIPT_URL);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("accepted");
    await expect
      .poll(() =>
        page.evaluate(
          (counterId) =>
            window.ym?.a?.find(
              (command) => command[0] === counterId && command[1] === "init",
            ),
          METRIKA_COUNTER_ID,
        ),
      )
      .toMatchObject([
        METRIKA_COUNTER_ID,
        "init",
        {
          ...METRIKA_INIT_OPTIONS,
          referrer: expect.any(String),
          url: expect.stringContaining("http://"),
        },
      ]);
    expect(metrikaRequests).toEqual([METRIKA_SCRIPT_URL, METRIKA_SCRIPT_URL]);
  });
});
