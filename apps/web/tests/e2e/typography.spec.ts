import { expect, test, type Page } from "@playwright/test";

const publicPages = [
  "/",
  "/tovary",
  "/nabory",
  "/tovary/published-product",
  "/nabory/ritual-one",
] as const;

async function hangingShortWords(page: Page) {
  return page.locator("body").evaluate((body) => {
    const shortWords = [
      "а",
      "б",
      "без",
      "бы",
      "в",
      "во",
      "вот",
      "да",
      "для",
      "до",
      "ж",
      "же",
      "за",
      "и",
      "из",
      "или",
      "к",
      "как",
      "ко",
      "ли",
      "ль",
      "на",
      "над",
      "не",
      "ни",
      "но",
      "о",
      "об",
      "обо",
      "от",
      "по",
      "под",
      "при",
      "про",
      "с",
      "со",
      "у",
      "что",
    ];
    const pattern = new RegExp(
      `(^|[\\s([{«„"'])(${shortWords.join("|")})[ \\t\\r\\n]+(?=[\\p{L}\\p{N}])`,
      "giu",
    );
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const failures = new Set<string>();

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest("script, style, noscript, code, textarea") ||
        parent.closest('[aria-hidden="true"]') ||
        !parent.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        continue;
      }

      const value = node.textContent ?? "";
      if (pattern.test(value)) failures.add(value.trim().replace(/\s+/g, " "));
      pattern.lastIndex = 0;
    }

    return [...failures];
  });
}

for (const path of publicPages) {
  test(`visible text has no hanging Russian service words on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    expect(await hangingShortWords(page)).toEqual([]);
  });
}

test("empty cart copy has no hanging Russian service words", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Открыть корзину/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await hangingShortWords(page)).toEqual([]);
});

test("filled cart and checkout copy have no hanging Russian service words", async ({
  page,
}) => {
  await page.goto("/tovary/published-product");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await hangingShortWords(page)).toEqual([]);

  await page.getByRole("button", { name: "Перейти к оформлению" }).click();
  await expect(page.getByText("Способ получения")).toBeVisible();
  expect(await hangingShortWords(page)).toEqual([]);
});

test("mobile navigation copy has no hanging Russian service words", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.locator("[data-mobile-menu]")).toBeVisible();
  expect(await hangingShortWords(page)).toEqual([]);
});

test("analytics consent copy has no hanging Russian service words", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.removeItem("brega.analytics-consent.v1"),
  );
  await page.reload();
  await expect(page.locator("[data-analytics-consent]")).toBeVisible();
  expect(await hangingShortWords(page)).toEqual([]);
});
