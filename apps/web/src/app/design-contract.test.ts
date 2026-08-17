import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesUrl = new URL("./styles.css", import.meta.url);
const homeStylesUrl = new URL("../components/home.module.css", import.meta.url);
const mobileMenuStylesUrl = new URL(
  "../components/mobile-menu.module.css",
  import.meta.url,
);
const productStylesUrl = new URL(
  "../components/product-detail.module.css",
  import.meta.url,
);
const heroLayoutUrl = new URL(
  "../components/home-hero-layout.ts",
  import.meta.url,
);
const homeNaboryUrl = new URL("../components/home-nabory.tsx", import.meta.url);
const homeTovaryUrl = new URL("../components/home-tovary.tsx", import.meta.url);
const homeSliderControlsUrl = new URL(
  "../components/home-slider-controls.tsx",
  import.meta.url,
);
const productCardUrl = new URL(
  "../components/product-card.tsx",
  import.meta.url,
);
const productDetailUrl = new URL(
  "../components/product-detail.tsx",
  import.meta.url,
);
const moneyStylesUrl = new URL(
  "../components/money-amount.module.css",
  import.meta.url,
);
const cartDrawerUrl = new URL(
  "../features/cart/components/cart-drawer.tsx",
  import.meta.url,
);
const checkoutPanelUrl = new URL(
  "../features/checkout/checkout-panel.tsx",
  import.meta.url,
);

test("semantic typography and structural frame tokens drive public layouts", async () => {
  const [styles, homeStyles, mobileMenuStyles, productStyles] =
    await Promise.all([
      readFile(stylesUrl, "utf8"),
      readFile(homeStylesUrl, "utf8"),
      readFile(mobileMenuStylesUrl, "utf8"),
      readFile(productStylesUrl, "utf8"),
    ]);

  assert.match(styles, /--content-max:\s*92rem;/);
  assert.match(styles, /--type-hero:\s*clamp\(/);
  assert.match(homeStyles, /\.heroCopy h1\s*\{[^}]*var\(--type-hero\)/s);
  assert.match(
    homeStyles,
    /\.sectionHeader h2\s*\{[^}]*var\(--type-heading-2\)/s,
  );
  assert.match(homeStyles, /\.about h2\s*\{[^}]*var\(--type-heading-2\)/s);
  assert.match(
    productStyles,
    /\.commerce h1\s*\{[^}]*var\(--type-heading-1\)/s,
  );
  assert.match(mobileMenuStyles, /\.nav a\s*\{[^}]*var\(--type-heading-1\)/s);
  assert.doesNotMatch(mobileMenuStyles, /\.nav a\s*\{[^}]*clamp\(/s);
  assert.match(
    styles,
    /\.content-frame\s*\{[^}]*max-width:\s*calc\(var\(--content-max\) \+ 2 \* var\(--page-gutter\)\)/s,
  );
  assert.match(styles, /\.site-header__content\s*\{[^}]*display:\s*grid;/s);
  assert.match(styles, /\.site-footer__content\s*\{[^}]*display:\s*grid;/s);
  assert.match(homeStyles, /\.heroInner\s*\{[^}]*display:\s*grid;/s);
  assert.match(
    homeStyles,
    /\.hero\[data-layout="40\/60"\] \.heroInner\s*\{[^}]*grid-template-columns:\s*2fr 3fr;/s,
  );
  assert.match(homeStyles, /\.aboutInner\s*\{[^}]*display:\s*grid;/s);
  assert.match(homeStyles, /\.catalogInner\s*\{[^}]*padding:/s);
});

test("responsive image hints follow the 1600px content frame", async () => {
  const [heroLayout, homeNabory, productCard] = await Promise.all([
    readFile(heroLayoutUrl, "utf8"),
    readFile(homeNaboryUrl, "utf8"),
    readFile(productCardUrl, "utf8"),
  ]);

  assert.match(heroLayout, /\(max-width: 1600px\) 60vw, 960px/);
  assert.match(heroLayout, /\(max-width: 1600px\) 50vw, 800px/);
  assert.match(homeNabory, /368px/);
  assert.match(productCard, /368px/);
});

test("home sliders use matching prominent controls without an underline", async () => {
  const [homeNabory, homeTovary, homeSliderControls, homeStyles] =
    await Promise.all([
      readFile(homeNaboryUrl, "utf8"),
      readFile(homeTovaryUrl, "utf8"),
      readFile(homeSliderControlsUrl, "utf8"),
      readFile(homeStylesUrl, "utf8"),
    ]);

  assert.match(homeNabory, /HomeSliderControls/);
  assert.match(homeNabory, /prominent/);
  assert.match(homeTovary, /HomeSliderControls/);
  assert.match(homeTovary, /prominent/);
  assert.match(homeSliderControls, /styles\.controlsProminent/);
  assert.match(homeStyles, /\.controlsProminent\s*\{[^}]*border-bottom:\s*0;/s);
  assert.match(
    homeStyles,
    /\.controlsProminent button\s*\{[^}]*width:\s*2\.5rem;[^}]*height:\s*2\.5rem;/s,
  );
  assert.match(homeNabory, /SliderProgress/);
  assert.match(homeNabory, /useHorizontalSlider/);
});

test("every storefront money amount uses compact Manrope tabular numerals", async () => {
  const [moneyStyles, productCard, productDetail, cartDrawer, checkoutPanel] =
    await Promise.all([
      readFile(moneyStylesUrl, "utf8"),
      readFile(productCardUrl, "utf8"),
      readFile(productDetailUrl, "utf8"),
      readFile(cartDrawerUrl, "utf8"),
      readFile(checkoutPanelUrl, "utf8"),
    ]);

  assert.match(
    moneyStyles,
    /\.money\s*\{[^}]*font-family:\s*var\(--font-interface\);[^}]*font-weight:\s*500;[^}]*font-variant-numeric:\s*tabular-nums;[^}]*white-space:\s*nowrap;/s,
  );
  assert.match(moneyStyles, /\.card\s*\{[^}]*font-size:\s*1\.125rem;/s);
  assert.match(
    moneyStyles,
    /\.detail\s*\{[^}]*font-size:\s*clamp\(1\.375rem, 2\.25vw, 1\.75rem\);/s,
  );
  assert.match(moneyStyles, /\.line\s*\{[^}]*font-size:\s*1rem;/s);
  assert.match(
    moneyStyles,
    /\.total\s*\{[^}]*font-size:\s*clamp\(1\.25rem, 2vw, 1\.5rem\);/s,
  );
  assert.match(moneyStyles, /\.previousTotal\s*\{[^}]*font-size:\s*1rem;/s);
  for (const source of [
    productCard,
    productDetail,
    cartDrawer,
    checkoutPanel,
  ]) {
    assert.match(source, /<MoneyAmount/u);
  }
});
