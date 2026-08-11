import assert from "node:assert/strict";
import test from "node:test";

import {
  buildListSearch,
  calculateEditedOrderTotals,
  formatOrderDate,
  formatRubles,
  getDeliveryMethodPresentation,
  getOrderEditErrorMessage,
  getStatusActionLabel,
  getStatusConfirmation,
  getStatusPresentation,
  unwrapDetailResponse,
} from "../src/plugins/order-admin/admin/src/view-model.ts";

test("order statuses have concise Russian operational labels", () => {
  assert.deepEqual(getStatusPresentation("new"), {
    label: "Новый",
    variant: "secondary",
  });
  assert.deepEqual(getStatusPresentation("confirmed"), {
    label: "Подтверждён",
    variant: "success",
  });
  assert.deepEqual(getStatusPresentation("completed"), {
    label: "Выполнен",
    variant: "neutral",
  });
  assert.deepEqual(getStatusPresentation("cancelled"), {
    label: "Отменён",
    variant: "danger",
  });
});

test("edit preview recalculates standard and discounted totals", () => {
  assert.deepEqual(
    calculateEditedOrderTotals(
      [
        { unitPriceRubles: 1600, quantity: 2 },
        { unitPriceRubles: 900, quantity: 1 },
      ],
      10,
    ),
    { totalRubles: 4100, discountedTotalRubles: 3690 },
  );
});

test("edit error prefers the safe API message", () => {
  assert.equal(
    getOrderEditErrorMessage({
      response: {
        data: { error: { message: "Недостаточно товара на складе" } },
      },
    }),
    "Недостаточно товара на складе",
  );
  assert.equal(
    getOrderEditErrorMessage(new Error("private database details")),
    "Не удалось сохранить изменения",
  );
});

test("list search keeps only active filters and stable pagination", () => {
  assert.equal(
    buildListSearch({
      page: 2,
      pageSize: 25,
      search: "  BC-42  ",
      status: "new",
      createdFrom: "",
      createdTo: undefined,
    }),
    "?page=2&pageSize=25&search=BC-42&status=new",
  );
});

test("money and date formatting is deterministic for Russian admin UI", () => {
  assert.equal(formatRubles(12500), "12 500 ₽");
  assert.equal(
    formatOrderDate("2026-07-30T12:05:00.000Z", "UTC"),
    "30.07.2026, 12:05",
  );
});

test("detail response unwraps the admin API envelope", () => {
  const order = { documentId: "order-1", deliveryAddress: "Москва" };
  assert.equal(unwrapDetailResponse({ data: order }), order);
});

test("delivery methods use matching operational address labels", () => {
  assert.deepEqual(getDeliveryMethodPresentation("pickup"), {
    label: "Самовывоз",
    addressLabel: "Адрес самовывоза",
  });
  assert.deepEqual(getDeliveryMethodPresentation("courier"), {
    label: "Курьер",
    addressLabel: "Адрес доставки",
  });
});

test("status actions use direct operational labels", () => {
  assert.equal(getStatusActionLabel("confirmed"), "Подтвердить заказ");
  assert.equal(getStatusActionLabel("completed"), "Завершить заказ");
  assert.equal(getStatusActionLabel("cancelled"), "Отменить заказ");
});

test("every status action requires an explicit confirmation", () => {
  assert.deepEqual(getStatusConfirmation("confirmed"), {
    title: "Подтвердить заказ?",
    description: "Статус заказа изменится на «Подтверждён».",
    confirmLabel: "Подтвердить заказ",
  });
  assert.match(
    getStatusConfirmation("cancelled").description,
    /остатки будут возвращены/,
  );
});
