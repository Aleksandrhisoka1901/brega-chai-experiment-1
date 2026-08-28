import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, test } from "@playwright/test";

async function computedStyles(locator: Locator, properties: string[]) {
  await expect(locator).toBeVisible();
  return locator.evaluate((element, names) => {
    const styles = getComputedStyle(element);
    return Object.fromEntries(
      names.map((name) => [name, styles.getPropertyValue(name)]),
    );
  }, properties);
}

test("published product has a vertical keyboard-operable gallery @smoke", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  await expect(page).toHaveTitle(/Да Хун Пао — сорт чая Brega Tea/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Да Хун Пао" }),
  ).toBeVisible();
  await expect(page.getByText("Сорт", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Пакетик (50 г)")).toHaveCSS(
    "font-family",
    /Cormorant/,
  );
  const price = page.getByText("1 600 ₽", { exact: true });
  await expect(price).toHaveCSS("font-family", /Manrope/);
  await expect(price).toHaveCSS("font-size", "28px");
  await expect(price).toHaveCSS("font-weight", "500");
  await expect(price).toHaveCSS("font-variant-numeric", "tabular-nums");
  const breadcrumbs = page.getByRole("navigation", {
    name: "Хлебные крошки",
  });
  await expect(
    breadcrumbs.getByRole("link", { name: "Главная" }),
  ).toHaveAttribute("href", "/");
  await expect(
    breadcrumbs.getByRole("link", { name: "Сорта" }),
  ).toHaveAttribute("href", "/stantsii");
  await expect(breadcrumbs.getByText("Да Хун Пао")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("Большой красный халат")).toBeVisible();
  const titleSize = await page
    .getByRole("heading", { level: 1, name: "Да Хун Пао" })
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(titleSize).toBeLessThan(80);
  await expect(
    page.getByRole("heading", { level: 2, name: "Как раскрывается чай" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Хранение чая" }),
  ).toBeVisible();

  const gallery = page.getByRole("group", { name: "Изображения товара" });
  const firstThumbnail = gallery.getByRole("button").first();
  const secondThumbnail = gallery.getByRole("button").nth(1);
  const mainImage = page.getByRole("img", { name: "Пачка чая" });
  const [thumbnailBox, imageBox] = await Promise.all([
    firstThumbnail.boundingBox(),
    mainImage.boundingBox(),
  ]);

  expect(thumbnailBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  expect(thumbnailBox!.x).toBeLessThan(imageBox!.x);
  expect(
    Math.abs(
      (await firstThumbnail.boundingBox())!.x -
        (await secondThumbnail.boundingBox())!.x,
    ),
  ).toBeLessThan(2);

  await secondThumbnail.focus();
  await page.keyboard.press("Enter");

  await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("img", { name: "Сухой чайный лист" }),
  ).toBeVisible();
  const transitionedImage = page.getByRole("img", {
    name: "Сухой чайный лист",
  });
  await expect(transitionedImage).toHaveCSS("transition-duration", "0.36s");
  await expect(transitionedImage).toHaveCSS("opacity", "1");
  await expect(page.locator('img[data-active="true"]')).toHaveCount(1);
  await expect(page.locator('img[data-active="false"]')).toHaveCount(0);
  await expect(secondThumbnail).toBeFocused();
});

test("native product story shares article typography for common blocks", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  const story = page.locator('[data-rich-content-scope="product-story"]');
  const article = page.locator('[data-rich-content-scope="article"]').first();
  const contracts = [
    {
      selector: ":scope",
      properties: ["font-family", "font-size", "line-height"],
    },
    {
      selector: "p",
      properties: ["font-family", "font-size", "line-height"],
    },
    ...["h2", "h3", "h4"].map((selector) => ({
      selector,
      properties: [
        "font-family",
        "font-size",
        "font-weight",
        "letter-spacing",
        "line-height",
      ],
    })),
    ...["ul", "ol"].map((selector) => ({
      selector,
      properties: ["padding-left"],
    })),
    {
      selector: "li",
      properties: ["padding-left"],
    },
    {
      selector: "blockquote",
      properties: [
        "border-left-width",
        "border-left-style",
        "font-size",
        "line-height",
        "padding-left",
      ],
    },
    {
      selector: "blockquote p",
      properties: ["margin-top", "margin-bottom"],
    },
    {
      selector: "a",
      properties: [
        "color",
        "overflow-wrap",
        "text-decoration-thickness",
        "text-underline-offset",
      ],
    },
    ...["strong", "em", "u", "s"].map((selector) => ({
      selector,
      properties: ["font-style", "font-weight", "text-decoration-line"],
    })),
    {
      selector: "figure img",
      properties: ["display"],
    },
    {
      selector: "figcaption",
      properties: ["color", "font-family", "font-size", "margin-top"],
    },
    {
      selector: "code",
      properties: ["font-family", "font-size"],
    },
  ];

  for (const contract of contracts) {
    const storyNode =
      contract.selector === ":scope"
        ? story
        : story.locator(contract.selector).first();
    const articleNode =
      contract.selector === ":scope"
        ? article
        : article.locator(contract.selector).first();
    expect(
      await computedStyles(storyNode, contract.properties),
      contract.selector,
    ).toEqual(await computedStyles(articleNode, contract.properties));
  }

  const copy = story.locator("..");
  await expect(copy).toHaveCSS("row-gap", "40px");

  const storyParagraphs = story.locator(":scope > p");
  await expect(storyParagraphs).toHaveCount(3);
  await expect(storyParagraphs.first()).toHaveCSS("margin-bottom", "8px");
  const [firstStoryParagraph, secondStoryParagraph] = await Promise.all([
    storyParagraphs.first().boundingBox(),
    storyParagraphs.nth(1).boundingBox(),
  ]);
  expect(firstStoryParagraph).not.toBeNull();
  expect(secondStoryParagraph).not.toBeNull();
  expect(
    secondStoryParagraph!.y -
      (firstStoryParagraph!.y + firstStoryParagraph!.height),
    "gap between adjacent product-story paragraphs",
  ).toBeCloseTo(8, 0);
  await expect(story.locator("ul").first()).toHaveCSS("margin-bottom", "16px");
  await expect(story.locator("li").first()).toHaveCSS("margin-bottom", "4px");
  await expect(story.locator("h3").first()).toHaveCSS("margin-bottom", "12px");

  const articleParagraphs = article.locator(":scope > p");
  await expect(articleParagraphs).toHaveCount(3);
  await expect(articleParagraphs.first()).toHaveCSS("margin-bottom", "16px");
  await expect(article.locator("ul").first()).toHaveCSS(
    "margin-bottom",
    "24px",
  );
  await expect(article.locator("h3").first()).toHaveCSS(
    "margin-bottom",
    "16px",
  );
});

test("gallery optimizes only the selected full-size CMS image", async ({
  page,
}) => {
  const optimizedSources: string[] = [];
  const optimizedResponses: Array<{
    cacheControl: string | undefined;
    contentType: string | undefined;
    quality: string | null;
    source: string;
  }> = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname !== "/_next/image") return;
    const source = url.searchParams.get("url");
    if (source) optimizedSources.push(decodeURIComponent(source));
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/_next/image") return;
    const source = url.searchParams.get("url");
    if (!source) return;
    const headers = response.headers();
    optimizedResponses.push({
      cacheControl: headers["cache-control"],
      contentType: headers["content-type"],
      quality: url.searchParams.get("q"),
      source: decodeURIComponent(source),
    });
  });

  await page.goto("/stantsii/published-product");
  await expect(page.getByRole("img", { name: "Пачка чая" })).toBeVisible();
  await expect
    .poll(() => optimizedSources.some((url) => url.includes("-main.png")))
    .toBe(true);
  await expect
    .poll(() =>
      optimizedResponses.find((response) =>
        response.source.includes("-main.png"),
      ),
    )
    .toMatchObject({
      cacheControl: expect.stringContaining("max-age=3600"),
      contentType: expect.stringMatching(/^image\/(avif|webp)$/),
      quality: "75",
    });
  expect(optimizedSources.some((url) => url.includes("-gallery-1.png"))).toBe(
    false,
  );
  expect(optimizedSources.some((url) => url.includes("-gallery-2.png"))).toBe(
    false,
  );

  await page
    .getByRole("group", { name: "Изображения товара" })
    .getByRole("button")
    .nth(1)
    .click();

  await expect
    .poll(() => optimizedSources.some((url) => url.includes("-gallery-1.png")))
    .toBe(true);
  expect(optimizedSources.some((url) => url.includes("-gallery-2.png"))).toBe(
    false,
  );
});

test("gallery crossfades two loaded layers before removing the previous one", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  const mainImage = page.getByRole("group", {
    name: "Главное изображение товара",
  });
  await mainImage.evaluate((element) => {
    const states: string[] = [];
    const record = () => {
      const images = [...element.querySelectorAll("img[data-active]")];
      const active = images.filter(
        (image) => image.getAttribute("data-active") === "true",
      ).length;
      states.push(`${images.length}:${active}:${images.length - active}`);
    };
    new MutationObserver(record).observe(element, {
      attributeFilter: ["data-active"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    (
      window as typeof window & { __galleryTransitionStates?: string[] }
    ).__galleryTransitionStates = states;
    record();
  });

  await page
    .getByRole("group", { name: "Изображения товара" })
    .getByRole("button", { name: "Показать изображение 2" })
    .click();

  await expect(
    page.getByRole("img", { name: "Сухой чайный лист" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            __galleryTransitionStates?: string[];
          }
        ).__galleryTransitionStates?.includes("2:1:1"),
      ),
    )
    .toBe(true);
  await expect(mainImage.locator("img[data-active]")).toHaveCount(1);
});

test("gallery controls use neutral positional accessible names", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  const gallery = page.getByRole("group", { name: "Изображения товара" });
  await expect(gallery.getByRole("button")).toHaveCount(3);
  for (let index = 1; index <= 3; index += 1) {
    await expect(
      gallery.getByRole("button", {
        name: `Показать изображение ${index}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(
    gallery.getByRole("button", {
      name: "Показать изображение 1",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: "Пачка чая" })).toBeVisible();

  for (const [index, alt] of [
    [2, "Сухой чайный лист"],
    [3, "Чай в пиале"],
    [1, "Пачка чая"],
  ] as const) {
    const thumbnail = gallery.getByRole("button", {
      name: `Показать изображение ${index}`,
      exact: true,
    });
    await thumbnail.click();
    await expect(thumbnail).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("img", { name: alt })).toBeVisible();
  }
});

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`main-image-only product keeps one thumbnail on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/stantsii/main-image-only");

    const gallery = page.getByRole("group", { name: "Изображения товара" });
    const thumbnail = gallery.getByRole("button", {
      name: "Показать изображение 1",
      exact: true,
    });

    await expect(gallery.getByRole("button")).toHaveCount(1);
    await expect(thumbnail).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('img[data-active="true"]')).toHaveAttribute(
      "alt",
      "",
    );
  });
}

test("mobile gallery switches images with horizontal touch swipes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stantsii/published-product");

  const gallery = page.getByRole("group", { name: "Изображения товара" });
  const firstThumbnail = gallery.getByRole("button").first();
  const secondThumbnail = gallery.getByRole("button").nth(1);
  const swipeSurface = page.getByRole("group", {
    name: "Главное изображение товара",
  });
  const box = await swipeSurface.boundingBox();

  expect(box).not.toBeNull();
  await swipeSurface.dispatchEvent("pointerdown", {
    clientX: box!.x + box!.width * 0.8,
    clientY: box!.y + box!.height * 0.5,
    pointerId: 7,
    pointerType: "touch",
  });
  await swipeSurface.dispatchEvent("pointerup", {
    clientX: box!.x + box!.width * 0.2,
    clientY: box!.y + box!.height * 0.52,
    pointerId: 7,
    pointerType: "touch",
  });

  await expect(secondThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("img", { name: "Сухой чайный лист" }),
  ).toBeVisible();

  await swipeSurface.dispatchEvent("pointerdown", {
    clientX: box!.x + box!.width * 0.2,
    clientY: box!.y + box!.height * 0.5,
    pointerId: 8,
    pointerType: "touch",
  });
  await swipeSurface.dispatchEvent("pointerup", {
    clientX: box!.x + box!.width * 0.8,
    clientY: box!.y + box!.height * 0.48,
    pointerId: 8,
    pointerType: "touch",
  });

  await expect(firstThumbnail).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: "Пачка чая" })).toBeVisible();
});

test("quantity starts at one and is capped at five", async ({ page }) => {
  await page.goto("/stantsii/published-product");

  const increase = page.getByRole("button", {
    name: "Увеличить количество",
  });
  const decrease = page.getByRole("button", {
    name: "Уменьшить количество",
  });
  const quantity = page.locator("output");

  await expect(quantity).toHaveText("1");
  await expect(decrease).toBeDisabled();

  for (let index = 0; index < 4; index += 1) {
    await increase.click();
  }

  await expect(quantity).toHaveText("5");
  await expect(increase).toBeDisabled();
});

test("quantity follows live stock on mount and when the tab regains focus", async ({
  page,
}) => {
  let liveStock = 4;
  const requestedProductIds: string[][] = [];
  await page.route("**/api/checkout/stock", async (route) => {
    const body = route.request().postDataJSON() as { productIds: string[] };
    requestedProductIds.push(body.productIds);
    await route.fulfill({
      contentType: "application/json",
      json: {
        stocks: body.productIds.map((productId) => ({
          productId,
          stock: liveStock,
        })),
      },
      status: 200,
    });
  });

  await page.goto("/stantsii/published-product");

  const increase = page.getByRole("button", {
    name: "Увеличить количество",
  });
  const quantity = page.locator("output");
  await expect.poll(() => requestedProductIds.length).toBeGreaterThan(0);
  expect(requestedProductIds.at(-1)).toEqual(["document-published-product"]);

  for (let index = 0; index < 3; index += 1) {
    await increase.click();
  }
  await expect(quantity).toHaveText("4");
  await expect(increase).toBeDisabled();

  liveStock = 2;
  const requestsBeforeFocus = requestedProductIds.length;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect
    .poll(() => requestedProductIds.length)
    .toBeGreaterThan(requestsBeforeFocus);
  await expect(quantity).toHaveText("2");
  await expect(increase).toBeDisabled();
});

test("out-of-stock product cannot be added or assigned a quantity", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");
  const populatedSlotHeight = await page
    .locator("[data-original-title-slot]")
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.goto("/stantsii/out-of-stock-product");

  const emptySlot = page.locator("[data-original-title-slot]");
  await expect(emptySlot).toHaveCSS("visibility", "hidden");
  expect(
    await emptySlot.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(populatedSlotHeight);
  await expect(page.getByText("Нет в наличии", { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Нет в наличии" }),
  ).toBeDisabled();
  await expect(page.getByRole("group", { name: "Количество" })).toHaveCount(0);
});

test("availability is communicated by the purchase action only", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  await expect(page.getByText("В наличии", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Добавить в корзину" }),
  ).toBeEnabled();
});

test("missing product returns the not-found page", async ({ page }) => {
  const response = await page.goto("/stantsii/missing-product");

  expect(response?.status()).toBe(404);
});

test("CMS outage renders a noindex service-unavailable state", async ({
  page,
}) => {
  await page.goto("/stantsii/unavailable-product");

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Страница товара временно недоступна" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("published product has no automatically detectable a11y violations @a11y", async ({
  page,
}) => {
  await page.goto("/stantsii/published-product");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
