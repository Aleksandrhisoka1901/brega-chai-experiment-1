import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

test("homepage follows the quiet-book desktop composition @visual", async ({
  page,
}) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  const headerBox = await header.boundingBox();
  expect(headerBox?.height).toBeGreaterThanOrEqual(72);
  expect(headerBox?.height).toBeLessThanOrEqual(80);

  const navigation = page.getByRole("navigation", {
    name: "Основная навигация",
  });
  await expect(navigation).toHaveCSS("gap", "34px");

  const cart = header.getByRole("button", { name: /Открыть корзину/ });
  await expect(cart).toHaveText(/Корзина\s*·\s*0/);
  await expect(cart.locator("svg")).toHaveCount(0);
  const wordmarkBox = await header
    .getByRole("link", { name: "Brega Tea — главная" })
    .boundingBox();

  const hero = page.locator("section[data-layout]").first();
  const heroFrame = hero.locator(":scope > [data-content-frame]");
  const heroPanels = heroFrame.locator(":scope > *");
  const heroBox = await hero.boundingBox();
  const copyBox = await heroPanels.nth(0).boundingBox();
  const mediaBox = await heroPanels.nth(1).boundingBox();
  expect(heroBox?.height).toBeGreaterThanOrEqual(900);
  expect((copyBox?.width ?? 0) / (heroBox?.width ?? 1)).toBeCloseTo(0.4, 1);
  expect((mediaBox?.width ?? 0) / (heroBox?.width ?? 1)).toBeCloseTo(0.6, 1);
  const heroHeading = hero.getByRole("heading", { level: 1 });
  const heroHeadingMetrics = await heroHeading.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      fontSize: Number.parseFloat(styles.fontSize),
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(styles.lineHeight),
    };
  });
  const heroBodySize = await hero
    .locator("p")
    .nth(1)
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(heroHeadingMetrics.fontSize / heroBodySize).toBeGreaterThanOrEqual(4);
  expect(heroHeadingMetrics.fontSize / heroBodySize).toBeLessThanOrEqual(5);
  expect(
    heroHeadingMetrics.height / heroHeadingMetrics.lineHeight,
  ).toBeLessThanOrEqual(2.1);

  const about = page.locator("#about");
  const aboutColumns = about.locator(":scope > [data-content-frame] > div");
  expect(await aboutColumns.count()).toBe(2);
  const aboutTitleBox = await aboutColumns.nth(0).boundingBox();
  const aboutCopyBox = await aboutColumns.nth(1).boundingBox();
  const aboutHeading = about.getByRole("heading", { level: 2 });
  const aboutHeadingMetrics = await aboutHeading.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(styles.lineHeight),
    };
  });
  expect(
    aboutHeadingMetrics.height / aboutHeadingMetrics.lineHeight,
  ).toBeLessThanOrEqual(4.1);
  expect(
    Math.abs(
      (aboutTitleBox?.y ?? 0) +
        (aboutTitleBox?.height ?? 0) -
        ((aboutCopyBox?.y ?? 0) + (aboutCopyBox?.height ?? 0)),
    ),
  ).toBeLessThanOrEqual(2);
  const aboutParagraphs = aboutColumns.nth(1).locator("p");
  await expect(aboutParagraphs).toHaveCount(2);
  await expect(aboutParagraphs.first()).toHaveCSS("font-size", "20px");

  const nabory = page.locator("#nabory");
  const naborCards = nabory.locator('[data-home-card="nabor"]');
  const naborTrackBox = await nabory
    .locator('[data-home-card="nabor"]')
    .first()
    .boundingBox();
  expect(
    Math.abs((wordmarkBox?.x ?? 0) - (naborTrackBox?.x ?? 0)),
  ).toBeLessThan(2);
  await expect(naborCards).toHaveCount(4);
  const firstNaborImage = naborCards.first().locator("img");
  await expect(firstNaborImage).toHaveCSS("transition-duration", "0.36s");
  await naborCards.first().hover();
  await expect(firstNaborImage).not.toHaveCSS("transform", "none");

  const products = page.locator("#tovary");
  const productGrid = products.locator(".product-grid");
  const productCards = products.locator(".product-card");
  await expect(productGrid).toHaveCSS("gap", "0px");
  await expect(productCards).toHaveCount(4);
  await expect(productCards.first().getByText("1 600 ₽")).toBeVisible();
  await expect(productCards.first().getByText("Пакетик (50 г)")).toBeVisible();
  await expect(productCards.first().getByText("В наличии")).toHaveCount(0);
  await expect(productCards.nth(1).getByText("2 400 ₽")).toHaveCount(0);
  await expect(productCards.nth(1).getByText("Нет в наличии")).toBeVisible();
  await expect(productCards.first().getByText("1 600 ₽")).toHaveCSS(
    "font-size",
    "18px",
  );
  await expect(productCards.first().getByText("1 600 ₽")).toHaveCSS(
    "font-family",
    /Manrope/,
  );
  await expect(productCards.first().getByText("1 600 ₽")).toHaveCSS(
    "font-weight",
    "500",
  );
  await expect(productCards.first().getByText("1 600 ₽")).toHaveCSS(
    "font-variant-numeric",
    "tabular-nums",
  );
  await expect(productCards.first().getByText("Пакетик (50 г)")).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(productCards.nth(1).getByText("Нет в наличии")).toHaveCSS(
    "font-size",
    "14px",
  );
  const firstProductHeading = productCards
    .first()
    .getByText("Пакетик (50 г)")
    .locator("..");
  await expect(firstProductHeading.getByRole("heading")).toHaveText(
    "Да Хун Пао",
  );
  await expect(firstProductHeading).toHaveCSS("align-items", "baseline");
  await expect(firstProductHeading).toHaveCSS("margin-bottom", "10px");
  await expect(firstProductHeading.getByRole("heading")).toHaveCSS(
    "margin-bottom",
    "0px",
  );
  await expect(firstProductHeading.getByText("Пакетик (50 г)")).toHaveCSS(
    "justify-self",
    "end",
  );
  const firstProductCommerce = productCards
    .first()
    .locator(".product-card__commerce");
  await expect(firstProductCommerce).toHaveCSS("justify-content", "flex-start");
  await expect(firstProductCommerce).toHaveCSS("border-top-width", "0px");
  await expect(products).toHaveCSS("background-color", "rgb(215, 207, 190)");
  const productsLink = products.getByRole("link", { name: "Все сорта" });
  await expect(productsLink).toHaveCSS("text-transform", "uppercase");
  await expect(productsLink.locator("svg")).toHaveCount(1);
  const productsLinkBox = await productsLink.boundingBox();
  const productGridBox = await productGrid.boundingBox();
  expect(productsLinkBox?.y).toBeGreaterThan(
    (productGridBox?.y ?? 0) + (productGridBox?.height ?? 0),
  );

  const footer = page.getByRole("contentinfo");
  const footerBox = await footer.boundingBox();
  expect(footerBox?.height).toBeGreaterThanOrEqual(290);
  await expect(footer.locator("[data-content-frame]")).toHaveCSS(
    "grid-template-columns",
    /.+px .+px .+px/,
  );
});

test("catalog headings do not reserve space for an absent eyebrow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");

  for (const sectionId of ["nabory", "tovary"]) {
    const header = page.locator(`#${sectionId} header`);
    await header.evaluate((element) => {
      element.querySelector(":scope > p")?.remove();
      element.setAttribute("data-has-eyebrow", "false");
    });

    await expect(header.getByRole("heading", { level: 2 })).toHaveCSS(
      "margin-top",
      "0px",
    );
  }
});

test("a single home card closes its tablet track", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  for (const track of [
    page.locator("#nabory [data-collection-layout]"),
    page.locator("#tovary .product-grid"),
  ]) {
    await expect(track).toHaveAttribute("data-card-count", "4");
    await track.evaluate((element) => {
      for (const child of [...element.children].slice(1)) child.remove();
      element.setAttribute("data-card-count", "1");
      element.setAttribute("data-collection-layout", "fixed");
      element.style.setProperty("--home-card-count", "1");
      element.style.setProperty("--home-track-max", "20.5rem");
      element.style.setProperty("--home-track-width", "25%");
    });

    const dimensions = await track.evaluate((element) => {
      const trackBox = element.getBoundingClientRect();
      const cardBox = element.firstElementChild?.getBoundingClientRect();

      return {
        cardLeft: cardBox?.left ?? 0,
        cardWidth: cardBox?.width ?? 0,
        trackLeft: trackBox.left,
        trackWidth: trackBox.width,
      };
    });

    expect(Math.abs(dimensions.trackLeft - dimensions.cardLeft)).toBeLessThan(
      2,
    );
    expect(
      Math.abs(dimensions.trackWidth - dimensions.cardWidth),
    ).toBeLessThanOrEqual(2);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    768,
  );
});

test("four home cards fill the desktop content width", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");

  for (const section of [page.locator("#nabory"), page.locator("#tovary")]) {
    const headerBox = await section.locator("header").boundingBox();
    const trackBox = await section
      .locator("[data-collection-layout]")
      .boundingBox();

    expect(trackBox?.width).toBeCloseTo(headerBox?.width ?? 0, 0);
  }
});

test("desktop hero title keeps its position without an eyebrow", async ({
  page,
}) => {
  await page.goto("/");

  const heroCopy = page
    .locator("section[data-layout]")
    .first()
    .locator("[data-content-frame] > div")
    .first();
  const title = heroCopy.getByRole("heading", { level: 1 });
  const eyebrow = heroCopy.locator(":scope > p");
  const titleWithEyebrow = await title.boundingBox();

  await eyebrow.evaluate((element) => element.remove());
  await heroCopy.evaluate((element) =>
    element.setAttribute("data-has-eyebrow", "false"),
  );

  const titleWithoutEyebrow = await title.boundingBox();
  expect(
    Math.abs((titleWithEyebrow?.y ?? 0) - (titleWithoutEyebrow?.y ?? 0)),
  ).toBeLessThan(1);
});

test("every public block stays inside the shared content frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  for (const path of ["/", "/tovary", "/nabory", "/tovary/published-product"]) {
    await page.goto(path);
    const frames = page.locator("[data-content-frame]");
    expect(await frames.count(), path).toBeGreaterThanOrEqual(3);

    for (const frame of await frames.all()) {
      const box = await frame.boundingBox();
      expect(box, path).not.toBeNull();
      expect(box!.width, path).toBeLessThanOrEqual(1600);
      expect(Math.abs(box!.x - (1920 - box!.width) / 2), path).toBeLessThan(2);
    }
  }
});

test("every hero mode stays aligned across responsive breakpoints", async ({
  page,
}) => {
  const modes = [
    { layout: "40/60", copyFraction: 0.4, hasMedia: true },
    { layout: "50/50", copyFraction: 0.5, hasMedia: true },
    { layout: "100/0", copyFraction: 1, hasMedia: false },
  ] as const;
  const viewports = [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1023, height: 900 },
    { width: 1024, height: 900 },
    { width: 1280, height: 900 },
    { width: 1366, height: 900 },
    { width: 1440, height: 1000 },
    { width: 1600, height: 1000 },
    { width: 1601, height: 1000 },
    { width: 1728, height: 1117 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const hero = page.locator("section[data-layout]").first();

    for (const mode of modes) {
      const metrics = await hero.evaluate((element, selectedMode) => {
        const frame = element.querySelector<HTMLElement>(
          "[data-content-frame]",
        );
        const copy = frame?.firstElementChild;
        const media = frame?.children.item(1);

        if (
          !(frame instanceof HTMLElement) ||
          !(copy instanceof HTMLElement) ||
          !(media instanceof HTMLElement)
        ) {
          throw new Error("Hero content frame is incomplete");
        }

        element.setAttribute("data-layout", selectedMode.layout);
        media.hidden = !selectedMode.hasMedia;

        const heroRect = element.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();
        const copyRect = copy.getBoundingClientRect();
        const mediaRect = selectedMode.hasMedia
          ? media.getBoundingClientRect()
          : null;
        const intro = copy.lastElementChild;
        const background = getComputedStyle(element, "::before");

        if (!(intro instanceof HTMLElement)) {
          throw new Error("Hero intro is missing");
        }

        return {
          copyBackground: getComputedStyle(copy).backgroundColor,
          copyBottom: copyRect.bottom,
          copyHeight: copyRect.height,
          copyRight: copyRect.right,
          copyWidth: copyRect.width,
          copyWithoutOverflow: copy.scrollWidth <= Math.ceil(copy.clientWidth),
          frameHeight: frameRect.height,
          frameLeft: frameRect.left,
          frameWidth: frameRect.width,
          heroBackground: getComputedStyle(element).backgroundColor,
          heroWidth: heroRect.width,
          introColumns:
            getComputedStyle(intro).gridTemplateColumns.split(" ").length,
          leftBackground: background.backgroundColor,
          mediaTop: mediaRect?.top,
          mediaWidth: mediaRect?.width ?? 0,
          splitFromBackground:
            heroRect.left + Number.parseFloat(background.width),
        };
      }, mode);
      const expectedFrameWidth = Math.min(viewport.width, 1600);

      expect(metrics.heroWidth, `${mode.layout} at ${viewport.width}`).toBe(
        viewport.width,
      );
      expect(metrics.frameWidth, `${mode.layout} at ${viewport.width}`).toBe(
        expectedFrameWidth,
      );
      expect(metrics.frameLeft, `${mode.layout} at ${viewport.width}`).toBe(
        (viewport.width - expectedFrameWidth) / 2,
      );
      expect(
        metrics.copyWithoutOverflow,
        `${mode.layout} at ${viewport.width}`,
      ).toBe(true);
      expect(metrics.introColumns, `${mode.layout} at ${viewport.width}`).toBe(
        viewport.width < 1440 ? 1 : 2,
      );

      if (viewport.width <= 1023) {
        expect(
          metrics.copyWidth,
          `${mode.layout} at ${viewport.width}`,
        ).toBeCloseTo(expectedFrameWidth, 0);
        if (mode.hasMedia) {
          expect(
            metrics.mediaWidth,
            `${mode.layout} at ${viewport.width}`,
          ).toBeCloseTo(expectedFrameWidth, 0);
          expect(
            metrics.mediaTop,
            `${mode.layout} at ${viewport.width}`,
          ).toBeCloseTo(metrics.copyBottom, 0);
        } else {
          expect(
            metrics.copyHeight,
            `${mode.layout} at ${viewport.width}`,
          ).toBeCloseTo(metrics.frameHeight, 0);
        }
      } else {
        expect(
          metrics.copyWidth / expectedFrameWidth,
          `${mode.layout} at ${viewport.width}`,
        ).toBeCloseTo(mode.copyFraction, 2);
        expect(
          metrics.mediaWidth / expectedFrameWidth,
          `${mode.layout} at ${viewport.width}`,
        ).toBeCloseTo(mode.hasMedia ? 1 - mode.copyFraction : 0, 2);
      }

      if (viewport.width > 1600) {
        expect(
          metrics.leftBackground,
          `${mode.layout} at ${viewport.width}`,
        ).not.toBe("rgba(0, 0, 0, 0)");
        expect(
          metrics.heroBackground,
          `${mode.layout} at ${viewport.width}`,
        ).not.toBe("rgba(0, 0, 0, 0)");
        expect(
          metrics.copyBackground,
          `${mode.layout} at ${viewport.width}`,
        ).toBe("rgba(0, 0, 0, 0)");
        expect(
          Math.abs(
            metrics.splitFromBackground -
              (mode.hasMedia ? metrics.copyRight : viewport.width),
          ),
          `${mode.layout} at ${viewport.width}`,
        ).toBeLessThan(2);
      } else {
        expect(
          metrics.copyBackground,
          `${mode.layout} at ${viewport.width}`,
        ).not.toBe("rgba(0, 0, 0, 0)");
      }
    }
  }
});
