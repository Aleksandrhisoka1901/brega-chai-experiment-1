export const YANDEX_METRIKA_COUNTER_ID = 112496290;

export const YANDEX_METRIKA_SCRIPT_URL = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_COUNTER_ID}`;

export const YANDEX_METRIKA_WATCH_URL = `https://mc.yandex.ru/watch/${YANDEX_METRIKA_COUNTER_ID}`;

export const METRIKA_GOALS = {
  inquirySubmit: "inquiry_submit",
  telegramClick: "telegram_click",
  emailClick: "email_click",
  cartOpen: "cart_open",
  orderSubmit: "order_submit",
} as const;

export function reachMetrikaGoal(
  goal: string,
  params?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const ym = (
    window as Window & { ym?: (...arguments_: unknown[]) => void }
  ).ym;
  ym?.(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goal, params);
}
