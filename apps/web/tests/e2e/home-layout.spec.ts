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
  const heroPanels = hero.locator(":scope > *");
  const heroBox = await hero.boundingBox();
  const copyBox = await heroPanels.nth(0).boundingBox();
  const mediaBox = await heroPanels.nth(1).boundingBox();
  expect(heroBox?.height).toBeGreaterThanOrEqual(900);
  expect((copyBox?.width ?? 0) / (heroBox?.width ?? 1)).toBeCloseTo(0.42, 1);
  expect((mediaBox?.width ?? 0) / (heroBox?.width ?? 1)).toBeCloseTo(0.58, 1);
  const heroHeading = hero.getByRole("heading", { level: 1 });
  const heroHeadingMetrics = await heroHeading.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(styles.lineHeight),
    };
  });
  expect(
    heroHeadingMetrics.height / heroHeadingMetrics.lineHeight,
  ).toBeLessThanOrEqual(2.1);

  const about = page.locator("#about");
  const aboutColumns = about.locator(":scope > div");
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
    "20px",
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
    .getByText("1 600 ₽")
    .locator("..");
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
  await expect(footer).toHaveCSS("grid-template-columns", /.+px .+px .+px/);
});
