"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { getCartSubtotal } from "../cart/model";
import { cartStore } from "../cart/use-cart";
import type { Cart } from "../cart/types";
import { createFetchCheckoutClient, type CheckoutClient } from "./client";
import { createBrowserCheckoutDraftPersistence } from "./draft";
import {
  checkoutSchema,
  type CheckoutField,
  type CheckoutFormValues,
  type CheckoutPayload,
} from "./validation";
import styles from "./checkout-panel.module.css";

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const labels: Record<CheckoutField, string> = {
  name: "Имя",
  phone: "Телефон",
  email: "Email",
  deliveryAddress: "Адрес доставки",
  comment: "Комментарий",
  privacyConsent: "Обработка персональных данных",
  termsConsent: "Условия продажи и доставки",
};

const defaults: CheckoutFormValues = {
  name: "",
  phone: "",
  email: "",
  deliveryAddress: "",
  comment: "",
  privacyConsent: false,
  termsConsent: false,
};

export function CheckoutPanel({
  cart,
  onBack,
  client,
}: {
  cart: Cart;
  onBack(): void;
  client?: CheckoutClient;
}) {
  const checkoutClient = useMemo(
    () => client ?? createFetchCheckoutClient(),
    [client],
  );
  const draft = useMemo(() => createBrowserCheckoutDraftPersistence(), []);
  const [result, setResult] = useState<
    | { type: "success"; message: string; orderNumber: string }
    | { type: "error"; message: string }
  >();
  const [honeypot, setHoneypot] = useState("");
  const [isPreparing, setIsPreparing] = useState(true);
  const submittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<CheckoutFormValues, unknown, CheckoutPayload>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaults,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    reset({ ...defaults, ...draft.load() });
  }, [draft, reset]);

  useEffect(() => {
    let active = true;
    Promise.resolve(checkoutClient.prepare?.())
      .catch(() => {
        if (active) {
          setResult({
            type: "error",
            message: "Форма временно недоступна. Обновите страницу.",
          });
        }
      })
      .finally(() => {
        if (active) setIsPreparing(false);
      });
    return () => {
      active = false;
    };
  }, [checkoutClient]);

  useEffect(() => {
    const subscription = watch((values) =>
      draft.save(values as CheckoutFormValues),
    );
    return () => subscription.unsubscribe();
  }, [draft, watch]);

  const errorEntries = Object.entries(errors) as [
    CheckoutField,
    { message?: string },
  ][];

  if (result?.type === "success") {
    return (
      <div className={styles.result} role="status">
        <p className={styles.kicker}>Заказ № {result.orderNumber}</p>
        <h2>Спасибо, заявка принята</h2>
        <p>{result.message}</p>
        <button onClick={onBack} type="button">
          Вернуться к покупкам
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit(
        async (values) => {
          if (submittingRef.current) return;
          submittingRef.current = true;
          setResult(undefined);
          try {
            const response = await checkoutClient.submit({
              customer: values,
              items: cart.items,
              honeypot,
            });
            if (response.ok) {
              draft.clear();
              cartStore.clear();
              setResult({
                type: "success",
                message: response.message,
                orderNumber: response.orderNumber,
              });
            } else {
              setResult({ type: "error", message: response.message });
            }
          } finally {
            submittingRef.current = false;
          }
        },
        (invalid) => {
          const first = Object.keys(invalid)[0] as CheckoutField | undefined;
          if (first) setFocus(first);
        },
      )}
    >
      <button className={styles.back} onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" />
        Назад к корзине
      </button>

      {errorEntries.length > 0 ? (
        <div className={styles.errorSummary} role="alert">
          <strong>Проверьте заполнение формы</strong>
          <ul>
            {errorEntries.map(([field, error]) => (
              <li key={field}>
                <button onClick={() => setFocus(field)} type="button">
                  {labels[field]}: {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.fields}>
        <label className={styles.honeypot} aria-hidden="true">
          Website
          <input
            autoComplete="off"
            name="website"
            onChange={(event) => setHoneypot(event.currentTarget.value)}
            tabIndex={-1}
            value={honeypot}
          />
        </label>
        <Field label="Имя" error={errors.name?.message}>
          <input
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>
        <Field label="Телефон" error={errors.phone?.message}>
          <input
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </Field>
        <Field label="Email (необязательно)" error={errors.email?.message}>
          <input
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
        <Field label="Адрес доставки" error={errors.deliveryAddress?.message}>
          <textarea
            autoComplete="street-address"
            rows={3}
            aria-invalid={Boolean(errors.deliveryAddress)}
            {...register("deliveryAddress")}
          />
        </Field>
        <Field
          label="Комментарий (необязательно)"
          error={errors.comment?.message}
        >
          <textarea rows={3} {...register("comment")} />
        </Field>
      </div>

      <div className={styles.consents}>
        <Checkbox error={errors.privacyConsent?.message}>
          <input type="checkbox" {...register("privacyConsent")} />
          <span>Согласен на обработку персональных данных</span>
        </Checkbox>
        <Checkbox error={errors.termsConsent?.message}>
          <input type="checkbox" {...register("termsConsent")} />
          <span>Принимаю условия продажи и доставки</span>
        </Checkbox>
      </div>

      <div className={styles.orderSummary}>
        <span>
          Товары, {cart.items.reduce((sum, item) => sum + item.quantity, 0)} шт.
        </span>
        <strong>{priceFormatter.format(getCartSubtotal(cart))}</strong>
        <p>Стоимость доставки менеджер подтвердит отдельно.</p>
      </div>

      {result?.type === "error" ? (
        <p className={styles.submitError} role="alert">
          <AlertCircle aria-hidden="true" />
          {result.message}
        </p>
      ) : null}

      <button
        aria-busy={isSubmitting}
        className={styles.submit}
        disabled={isSubmitting || isPreparing}
        type="submit"
      >
        {isSubmitting || isPreparing ? (
          <LoaderCircle aria-hidden="true" />
        ) : null}
        <span>Отправить заявку</span>
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      <small aria-live="polite">{error ?? "\u00a0"}</small>
    </label>
  );
}

function Checkbox({
  error,
  children,
}: {
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.checkbox}>
      <span className={styles.checkboxLine}>{children}</span>
      <small aria-live="polite">{error ?? "\u00a0"}</small>
    </label>
  );
}
