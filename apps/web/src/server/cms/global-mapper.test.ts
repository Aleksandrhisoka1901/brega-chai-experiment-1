import assert from "node:assert/strict";
import test from "node:test";

import { mapGlobalSettingsPayload } from "./global-mapper.ts";

test("maps storefront identity, contacts, navigation and legal details", () => {
  assert.deepEqual(
    mapGlobalSettingsPayload({
      data: {
        brandName: "Brega Chai",
        email: "hello@brega.test",
        telegramUrl: "https://t.me/brega",
        navigation: {
          about: "О нас",
          rituals: "Наборы",
          products: "Чай",
          cart: "Заказ",
        },
        legalDetails: "ИП Иванов\nИНН 123456789012",
      },
    }),
    {
      brandName: "Brega Chai",
      email: "hello@brega.test",
      telegramUrl: "https://t.me/brega",
      navigation: {
        about: "О нас",
        rituals: "Наборы",
        products: "Чай",
        cart: "Заказ",
      },
      legalDetails: "ИП Иванов\nИНН 123456789012",
    },
  );
});

test("rejects unsafe contact URLs at the CMS boundary", () => {
  assert.throws(() =>
    mapGlobalSettingsPayload({
      data: {
        brandName: "Brega Chai",
        email: "hello@brega.test",
        telegramUrl: "javascript:alert(1)",
        navigation: {
          about: "О нас",
          rituals: "Наборы",
          products: "Чай",
          cart: "Заказ",
        },
        legalDetails: "Реквизиты",
      },
    }),
  );
});
