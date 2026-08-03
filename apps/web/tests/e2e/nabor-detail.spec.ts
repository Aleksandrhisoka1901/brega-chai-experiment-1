import { expect, test } from "@playwright/test";

for (const nabor of [
  { slug: "ritual-one", title: "Утро без слов" },
  { slug: "ritual-two", title: "После дождя" },
]) {
  test(`nabor page renders complete detail for ${nabor.title}`, async ({
    page,
  }) => {
    const response = await page.goto(`/nabory/${nabor.slug}`);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(
      new RegExp(`${nabor.title} — чайный ритуал Brega Tea`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: nabor.title }),
    ).toBeVisible();
    const breadcrumbs = page.getByRole("navigation", {
      name: "Хлебные крошки",
    });
    await expect(
      breadcrumbs.getByRole("link", { name: "Ритуалы" }),
    ).toHaveAttribute("href", "/#nabory");
    await expect(breadcrumbs.getByText(nabor.title)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Ритуал", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Изображения товара" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Добавить в корзину" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { level: 2, name: "Как раскрывается чай" }),
    ).toBeVisible();
  });
}
