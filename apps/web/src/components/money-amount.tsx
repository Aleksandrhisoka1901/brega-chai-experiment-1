import styles from "./money-amount.module.css";

const formatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const variantClasses = {
  card: styles.card,
  detail: styles.detail,
  line: styles.line,
  total: styles.total,
  "previous-total": styles.previousTotal,
} as const;

export type MoneyAmountVariant = keyof typeof variantClasses;

export function MoneyAmount({
  rubles,
  variant,
}: {
  rubles: number;
  variant: MoneyAmountVariant;
}) {
  return (
    <span
      className={`${styles.money} ${variantClasses[variant]}`}
      data-money={variant}
    >
      {formatter.format(rubles)}
    </span>
  );
}
