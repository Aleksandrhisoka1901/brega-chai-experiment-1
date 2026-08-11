export function getOrderNumberPrefix(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      month: "2-digit",
      year: "2-digit",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}${parts.month}`;
}

export function createOrderNumber(now = new Date(), sequence = 1) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9_999) {
    throw new RangeError("Order number sequence must be between 1 and 9999");
  }

  return `${getOrderNumberPrefix(now)}-${String(sequence).padStart(4, "0")}`;
}

export function getNextOrderNumberSequence(
  latestOrderNumber: string | undefined,
  prefix: string,
) {
  if (!latestOrderNumber) return 1;
  const match = new RegExp(`^${prefix}-(\\d{4})$`).exec(latestOrderNumber);
  return match ? Number(match[1]) + 1 : 1;
}
