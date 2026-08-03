import assert from "node:assert/strict";
import test from "node:test";

import { mapGlobalSettingsPayload } from "./global-mapper.ts";

test("maps storefront identity, contacts, navigation and legal details", () => {
  assert.deepEqual(
    mapGlobalSettingsPayload(
      {
        data: {
          brandName: "Brega Chai",
          pickupAddress: "Москва, Чайная улица, 1",
          pickupDiscountPercent: 10,
          courierDeliveryNote: "До 1000 руб.",
          logo: {
            url: "/uploads/logo.png",
            width: 600,
            height: 180,
          },
          email: "hello@brega.test",
          telegramUrl: "https://t.me/brega",
          navigation: {
            about: "О нас",
            nabory: "Ритуалы",
            tovary: "Сорта",
            cart: "Заказ",
          },
          sectionBreadcrumbs: [
            { route: "tovary", label: "Каталог чая" },
            { route: "nabory", label: "Готовые ритуалы" },
          ],
          storefrontTexts: {
            imagePlaceholder: "Фото готовится",
            outOfStock: "Закончилось",
          },
          legalDetails: "ИП Иванов\nИНН 123456789012",
          defaultProductStory: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Описание бутика." }],
            },
          ],
          defaultSeo: {
            title: "Brega Chai",
            description: "Чай и ритуалы.",
          },
        },
      },
      "http://localhost:9000",
    ),
    {
      brandName: "Brega Chai",
      pickupAddress: "Москва, Чайная улица, 1",
      pickupDiscountPercent: 10,
      courierDeliveryNote: "До 1000 руб.",
      logo: {
        url: "http://localhost:9000/uploads/logo.png",
        width: 600,
        height: 180,
        sources: [],
      },
      email: "hello@brega.test",
      telegramUrl: "https://t.me/brega",
      navigation: {
        about: "О нас",
        nabory: "Ритуалы",
        tovary: "Сорта",
        cart: "Заказ",
      },
      sectionBreadcrumbs: {
        tovary: "Каталог чая",
        nabory: "Готовые ритуалы",
      },
      storefrontTexts: {
        imagePlaceholder: "Фото готовится",
        outOfStock: "Закончилось",
      },
      legalDetails: "ИП Иванов\nИНН 123456789012",
      defaultProductStory: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Описание бутика." }],
        },
      ],
      defaultSeo: {
        title: "Brega Chai",
        description: "Чай и ритуалы.",
      },
    },
  );
});

test("rejects unsafe contact URLs at the CMS boundary", () => {
  assert.throws(() =>
    mapGlobalSettingsPayload(
      {
        data: {
          brandName: "Brega Chai",
          pickupAddress: "Москва",
          pickupDiscountPercent: 10,
          courierDeliveryNote: "До 1000 руб.",
          email: "hello@brega.test",
          telegramUrl: "javascript:alert(1)",
          navigation: {
            about: "О нас",
            nabory: "Ритуалы",
            tovary: "Сорта",
            cart: "Заказ",
          },
          sectionBreadcrumbs: [],
          storefrontTexts: {
            imagePlaceholder: "Изображение готовится",
            outOfStock: "Нет в наличии",
          },
          legalDetails: "Реквизиты",
          defaultProductStory: [],
          defaultSeo: {
            title: "Brega Chai",
            description: "Чай и ритуалы.",
          },
        },
      },
      "http://localhost:9000",
    ),
  );
});

test("fills missing breadcrumb routes with stable visible-text fallbacks", () => {
  const settings = mapGlobalSettingsPayload(
    {
      data: {
        brandName: "Brega Chai",
        pickupAddress: "Москва",
        pickupDiscountPercent: 10,
        courierDeliveryNote: "До 1000 руб.",
        email: "hello@brega.test",
        telegramUrl: "https://t.me/brega",
        navigation: {
          about: "О нас",
          nabory: "Ритуалы",
          tovary: "Сорта",
          cart: "Заказ",
        },
        sectionBreadcrumbs: [{ route: "tovary", label: "Все сорта" }],
        storefrontTexts: {
          imagePlaceholder: "Изображение готовится",
          outOfStock: "Нет в наличии",
        },
        legalDetails: "Реквизиты",
        defaultProductStory: [],
        defaultSeo: { title: "Brega Chai", description: "Чай." },
      },
    },
    "http://localhost:9000",
  );

  assert.deepEqual(settings.sectionBreadcrumbs, {
    tovary: "Все сорта",
    nabory: "Ритуалы",
  });
});
