export type OrderStatus = "new" | "confirmed" | "completed" | "cancelled";
export type DeliveryMethod = "pickup" | "courier";

const STATUS_PRESENTATION = {
  new: { label: "Новый", variant: "secondary" },
  confirmed: { label: "Подтверждён", variant: "success" },
  completed: { label: "Выполнен", variant: "neutral" },
  cancelled: { label: "Отменён", variant: "danger" },
} as const;

const DELIVERY_METHOD_PRESENTATION = {
  pickup: { label: "Самовывоз", addressLabel: "Адрес самовывоза" },
  courier: { label: "Курьер", addressLabel: "Адрес доставки" },
} as const;

export function getStatusPresentation(status: OrderStatus) {
  return STATUS_PRESENTATION[status];
}

export function getStatusActionLabel(status: OrderStatus): string {
  return {
    new: "Новый заказ",
    confirmed: "Подтвердить заказ",
    completed: "Завершить заказ",
    cancelled: "Отменить заказ",
  }[status];
}

export function getStatusConfirmation(status: OrderStatus) {
  if (status === "cancelled") {
    return {
      title: "Отменить заказ?",
      description:
        "Товарные остатки будут возвращены. Это действие нельзя отменить через интерфейс.",
      confirmLabel: "Отменить заказ",
    };
  }

  const label = getStatusActionLabel(status);
  return {
    title: `${label}?`,
    description: `Статус заказа изменится на «${getStatusPresentation(status).label}».`,
    confirmLabel: label,
  };
}

export function getDeliveryMethodPresentation(method: DeliveryMethod) {
  return DELIVERY_METHOD_PRESENTATION[method];
}

export function formatRubles(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)}\u00a0₽`;
}

export function formatOrderDate(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(value));
}

export function buildListSearch(filters: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(filters.page));
  search.set("pageSize", String(filters.pageSize));

  const text = filters.search?.trim();
  if (text) search.set("search", text);
  if (filters.status) search.set("status", filters.status);
  if (filters.createdFrom) search.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) search.set("createdTo", filters.createdTo);

  return `?${search.toString()}`;
}

export function unwrapDetailResponse<T>(response: { data: T }) {
  return response.data;
}

export function calculateEditedOrderTotals(
  lines: Array<{ unitPriceRubles: number; quantity: number }>,
  pickupDiscountPercent: number,
) {
  const totalRubles = lines.reduce(
    (total, line) => total + line.unitPriceRubles * line.quantity,
    0,
  );
  return {
    totalRubles,
    discountedTotalRubles: Math.round(
      (totalRubles * (100 - pickupDiscountPercent)) / 100,
    ),
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") {
    return fallback;
  }
  const response = "response" in error ? error.response : null;
  if (!response || typeof response !== "object" || !("data" in response)) {
    return fallback;
  }
  const data = response.data;
  if (!data || typeof data !== "object" || !("error" in data)) {
    return fallback;
  }
  const apiError = data.error;
  return apiError && typeof apiError === "object" && "message" in apiError
    ? String(apiError.message)
    : fallback;
}

export function getOrderEditErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Не удалось сохранить изменения");
}

export function getOrderTransitionErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Обновите страницу и повторите действие.");
}
