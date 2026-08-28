import { expect, test } from "@playwright/test";

import { performanceBudgets } from "./performance-budgets";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`home meets synthetic Web Vitals budget on ${viewport.name} @performance`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const metrics = { cls: 0, lcp: 0 };
      Object.defineProperty(window, "__bregaPerformance", {
        configurable: false,
        value: metrics,
      });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.lcp = entry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) metrics.cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __bregaPerformance: { lcp: number };
              }
            ).__bregaPerformance.lcp,
        ),
      )
      .toBeGreaterThan(0);

    const metrics = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __bregaPerformance: { cls: number; lcp: number };
          }
        ).__bregaPerformance,
    );

    expect(metrics.lcp).toBeLessThanOrEqual(performanceBudgets.webVitals.lcpMs);
    expect(metrics.cls).toBeLessThanOrEqual(performanceBudgets.webVitals.cls);
  });
}

test("local font payload stays within its deterministic budget @performance", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const fonts = await page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => new URL(entry.name).pathname.endsWith(".woff2"))
      .map((entry) => ({
        bytes: entry.encodedBodySize,
        name: new URL(entry.name).pathname,
      })),
  );
  const totalBytes = fonts.reduce((total, font) => total + font.bytes, 0);

  expect(fonts.length, "No production fonts were measured").toBeGreaterThan(0);
  expect(totalBytes, JSON.stringify(fonts, null, 2)).toBeGreaterThan(0);
  expect(totalBytes).toBeLessThanOrEqual(performanceBudgets.assets.fontsBytes);
});

test("initial client JavaScript stays within its measured budget @performance", async ({
  page,
}) => {
  await page.goto("/");

  const scripts = await page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => entry.initiatorType === "script")
      .map((entry) => ({
        bytes: entry.encodedBodySize,
        name: new URL(entry.name).pathname,
      })),
  );
  const totalBytes = scripts.reduce((total, script) => total + script.bytes, 0);

  expect(scripts.length, "No production scripts were measured").toBeGreaterThan(
    0,
  );
  expect(totalBytes, JSON.stringify(scripts, null, 2)).toBeGreaterThan(0);
  expect(totalBytes).toBeLessThanOrEqual(
    performanceBudgets.assets.initialJsBytes,
  );
});

test("checkout code loads only when checkout is opened @performance", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");
  const add = page.getByRole("button", { name: "Добавить в корзину" });
  await expect(add).toHaveAttribute("data-cart-ready", "true");
  await add.click();

  const scriptsBefore = await page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => entry.initiatorType === "script")
      .map((entry) => entry.name),
  );

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Оформление" }),
  ).toBeVisible();

  const scriptsAfter = await page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => entry.initiatorType === "script")
      .map((entry) => entry.name),
  );

  expect(
    scriptsAfter.filter((script) => !scriptsBefore.includes(script)),
    "Checkout did not load an isolated client chunk",
  ).not.toEqual([]);
});
