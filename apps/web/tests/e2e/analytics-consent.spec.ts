import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CONSENT_STORAGE_KEY = "brega.analytics-consent.v1";
const METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";

test.describe("analytics consent", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps Yandex Metrika disabled before a choice and after rejection", async ({
    page,
  }) => {
    const metrikaRequests: string[] = [];
    await page.route("https://mc.yandex.ru/**", async (route) => {
      metrikaRequests.push(route.request().url());
      await route.fulfill({
        body: "",
        contentType: "application/javascript",
        status: 200,
      });
    });

    await page.goto("/");

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
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(0);
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
    expect(metrikaRequests).toEqual([]);

    await consent.getByRole("button", { name: "Отклонить" }).click();

    await expect(consent).toBeHidden();
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("rejected");
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
    expect(metrikaRequests).toEqual([]);

    await page.reload();

    await expect(consent).toBeHidden();
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(0);
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          CONSENT_STORAGE_KEY,
        ),
      )
      .toBe("rejected");
    expect(metrikaRequests).toEqual([]);
  });

  test("loads counter 111349846 after acceptance and keeps the choice", async ({
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
    await page.goto("/");

    const consent = page.locator("[data-analytics-consent]");
    await expect(consent).toBeVisible();
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(0);
    expect(await page.evaluate(() => typeof window.ym)).toBe("undefined");
    expect(metrikaRequests).toEqual([]);

    const scriptRequest = page.waitForRequest(METRIKA_SCRIPT_URL);
    await consent.getByRole("button", { name: "Принять" }).click();
    await scriptRequest;

    await expect(consent).toBeHidden();
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(1);
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
        page.evaluate(() =>
          window.ym?.a?.find(
            (command) => command[0] === 111349846 && command[1] === "init",
          ),
        ),
      )
      .toEqual([
        111349846,
        "init",
        {
          accurateTrackBounce: true,
          clickmap: true,
          trackLinks: true,
        },
      ]);
    expect(metrikaRequests).toEqual([METRIKA_SCRIPT_URL]);

    const persistedScriptRequest = page.waitForRequest(METRIKA_SCRIPT_URL);
    await page.reload();
    await persistedScriptRequest;

    await expect(consent).toBeHidden();
    await expect(
      page.locator(`script[src="${METRIKA_SCRIPT_URL}"]`),
    ).toHaveCount(1);
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
        page.evaluate(() =>
          window.ym?.a?.find(
            (command) => command[0] === 111349846 && command[1] === "init",
          ),
        ),
      )
      .toEqual([
        111349846,
        "init",
        {
          accurateTrackBounce: true,
          clickmap: true,
          trackLinks: true,
        },
      ]);
    expect(metrikaRequests).toEqual([METRIKA_SCRIPT_URL, METRIKA_SCRIPT_URL]);
  });
});
