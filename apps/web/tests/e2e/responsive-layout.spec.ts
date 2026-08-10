import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "compact-mobile", width: 320, height: 720 },
  { name: "mobile", width: 390, height: 844 },
  { name: "wide-mobile", width: 600, height: 900 },
  { name: "two-column", width: 768, height: 1024 },
  { name: "tablet", width: 1024, height: 1366 },
  { name: "wide-desktop", width: 1920, height: 1080 },
] as const;

async function expectNoPageOverflow(page: Page, width: number) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: width, scrollWidth: width });
}

for (const viewport of viewports) {
  test(`${viewport.name} keeps storefront and commerce inside the viewport @responsive`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    for (const path of ["/", "/tovary", "/tovary/published-product"]) {
      await page.goto(path);
      await expectNoPageOverflow(page, viewport.width);

      if (path === "/" || path === "/tovary") {
        const grid = page.locator(".product-grid").first();
        const styles = await grid.evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            autoFlow: computed.gridAutoFlow,
            columns: computed.gridTemplateColumns.split(" ").length,
          };
        });
        if (path === "/" && viewport.width <= 520) {
          expect(styles.autoFlow).toBe("column");
        } else {
          expect(styles.columns).toBe(
            viewport.width <= 520 ? 1 : viewport.width <= 1023 ? 2 : 4,
          );
        }
      }

      if (path === "/" && viewport.width > 520) {
        for (const sectionId of ["nabory", "tovary"]) {
          const header = page.locator(`#${sectionId} > header`);
          const titleBox = await header.getByRole("heading").boundingBox();
          const descriptionBox = await header.locator("p").nth(1).boundingBox();

          expect(titleBox).not.toBeNull();
          expect(descriptionBox).not.toBeNull();

          if (viewport.width <= 767) {
            expect(descriptionBox!.y).toBeGreaterThan(
              titleBox!.y + titleBox!.height,
            );
            expect(Math.abs(descriptionBox!.x - titleBox!.x)).toBeLessThan(2);
          } else {
            expect(
              Math.abs(
                titleBox!.y +
                  titleBox!.height -
                  (descriptionBox!.y + descriptionBox!.height),
              ),
            ).toBeLessThan(2);
          }
        }
      }

      if (path === "/" && viewport.width <= 1023) {
        const nabory = page.locator("#nabory");
        const naborTrack = nabory
          .locator('[data-home-card="nabor"]')
          .first()
          .locator("..");
        const nextNabory = nabory.getByRole("button", {
          name: "Следующие ритуалы",
        });
        await expect(nextNabory).toBeHidden();
        const before = await naborTrack.evaluate(
          (element) => element.scrollLeft,
        );
        await naborTrack.evaluate((element) => {
          element.scrollBy({ left: element.clientWidth, behavior: "instant" });
        });
        await expect
          .poll(() => naborTrack.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(before);
        await expect(nabory.getByText("Листать")).toHaveCount(0);
        await expect(nabory.getByText("Ритуалов: 4")).toHaveCount(0);

        await expect(
          page.locator("#tovary").getByRole("link", {
            name: "Все сорта",
          }),
        ).toBeVisible();

        if (viewport.width <= 520) {
          const products = page.locator("#tovary");
          const productTrack = products.locator(".product-grid");
          const nextProducts = products.getByRole("button", {
            name: "Следующие сорта",
          });
          await expect(nextProducts).toBeHidden();
          const beforeProducts = await productTrack.evaluate(
            (element) => element.scrollLeft,
          );
          await productTrack.evaluate((element) => {
            element.scrollBy({
              left: element.clientWidth,
              behavior: "instant",
            });
          });
          await expect
            .poll(() => productTrack.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(beforeProducts);
          await expect(products.getByText("Сортов: 4")).toHaveCount(0);

          const progressBox = await products
            .locator("[data-slider-progress]")
            .boundingBox();
          const catalogLinkBox = await products
            .getByRole("link", { name: "Все сорта" })
            .boundingBox();
          expect(progressBox).not.toBeNull();
          expect(catalogLinkBox).not.toBeNull();
          expect(
            (progressBox?.y ?? 0) + (progressBox?.height ?? 0),
          ).toBeLessThan(catalogLinkBox?.y ?? 0);
        }
      }

      if (path.includes("published-product") && viewport.width <= 1023) {
        const gallery = page.getByRole("group", {
          name: "Изображения товара",
        });
        const thumbnailBoxes = await gallery
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons.slice(0, 2).map((button) => {
              const box = button.getBoundingClientRect();
              return { x: box.x, y: box.y };
            }),
          );
        const mainImageBox = await page
          .getByRole("img", { name: "Пачка чая" })
          .boundingBox();
        expect(thumbnailBoxes[0]!.y).toBeGreaterThan(mainImageBox!.y);
        expect(
          Math.abs(thumbnailBoxes[0]!.y - thumbnailBoxes[1]!.y),
        ).toBeLessThan(2);
        expect(thumbnailBoxes[1]!.x).toBeGreaterThan(thumbnailBoxes[0]!.x);
        if (viewport.width <= 767) {
          expect(mainImageBox!.height).toBeLessThan(viewport.height);
        }
      }
    }

    const add = page.getByRole("button", { name: "Добавить в корзину" });
    await expect(add).toHaveAttribute("data-cart-ready", "true");
    await add.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return box
          ? {
              left: Math.round(box.x),
              right: Math.round(box.x + box.width),
            }
          : null;
      })
      .toEqual({
        left: viewport.width <= 600 ? 0 : viewport.width - 460,
        right: viewport.width,
      });

    const cartHeader = dialog.locator("header");
    await expect(cartHeader).toHaveCSS("border-bottom-style", "none");
    await expect(cartHeader).toHaveCSS("box-shadow", "none");
    await expect(dialog.locator("ul").locator("..")).toHaveCSS(
      "box-shadow",
      "none",
    );

    await dialog.getByRole("button", { name: "Перейти к оформлению" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Оформление" }),
    ).toBeVisible();
    await expect(dialog.locator("form").locator("..")).toHaveCSS(
      "overflow-y",
      "auto",
    );
    const checkoutHeader = dialog.locator("header");
    await expect(checkoutHeader).toHaveCSS("border-bottom-style", "none");
    await expect(checkoutHeader).toHaveCSS("box-shadow", "none");
    await expect(dialog.locator("form").locator("..")).toHaveCSS(
      "box-shadow",
      "none",
    );
    await expect(
      dialog.getByRole("button", { name: "Назад к корзине" }),
    ).toHaveCSS("padding-top", "12px");
  });
}
