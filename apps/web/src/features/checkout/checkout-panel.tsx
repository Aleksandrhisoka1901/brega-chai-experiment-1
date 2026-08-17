"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFieldLimits } from "@brega-chai/contracts";
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { CheckoutSettings } from "../../server/cms/global-mapper";

import { AutoResizeTextarea } from "../../components/auto-resize-textarea";
import { MoneyAmount } from "../../components/money-amount";
import { ScrollArea } from "../../components/scroll-area";
import { bindShortRussianWords } from "../../lib/typography";
import { getCartSubtotal } from "../cart/model";
import type { Cart } from "../cart/types";
import { createFetchCheckoutClient, type CheckoutClient } from "./client";
import { createBrowserCheckoutDraftPersistence } from "./draft";
import { PhoneInput } from "./phone-input";
import { getCheckoutPricing } from "./pricing";
import {
  checkoutSchema,
  type CheckoutField,
  type CheckoutFormValues,
  type CheckoutPayload,
} from "./validation";
import styles from "./checkout-panel.module.css";

const defaults = {
  deliveryMethod: undefined,
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
  checkoutSettings,
  onBack,
  onComplete,
  onOrderAccepted,
  client,
}: {
  cart: Cart;
  checkoutSettings: CheckoutSettings;
  onBack(): void;
  onComplete(): void;
  onOrderAccepted(): void;
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
  const [honeypot, setHoneypot] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const submittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<CheckoutFormValues, unknown, CheckoutPayload>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaults,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    reset({ ...defaults, ...draft.load() } as CheckoutFormValues);
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

  const deliveryMethod = watch("deliveryMethod");
  const standardTotal = getCartSubtotal(cart);
  const configuredPickupDiscount = checkoutSettings.pickupDiscountPercent ?? 0;
  const pricing = getCheckoutPricing(
    standardTotal,
    deliveryMethod,
    checkoutSettings.pickupDiscountPercent,
  );

  if (result?.type === "success") {
    return (
      <ScrollArea className={styles.viewport} topShadow>
        <div className={styles.result} role="status">
          <h2>Спасибо, заказ принят</h2>
          <div className={styles.orderNumber}>
            <span>Номер заказа</span>
            <strong>{result.orderNumber}</strong>
            <small>
              {bindShortRussianWords("Сохраните его для обращения к менеджеру")}
            </small>
          </div>
          <p>{bindShortRussianWords(result.message)}</p>
          <button onClick={onComplete} type="button">
            {bindShortRussianWords("Вернуться к покупкам")}
          </button>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className={styles.viewport} topShadow>
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
                onOrderAccepted();
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
          {bindShortRussianWords("Назад к корзине")}
        </button>

        <div className={styles.fields}>
          <label className={styles.honeypot} aria-hidden="true">
            Не отмечайте это поле
            <input
              autoComplete="off"
              checked={honeypot}
              name="checkout_secondary_confirmation"
              onChange={(event) => setHoneypot(event.currentTarget.checked)}
              tabIndex={-1}
              type="checkbox"
            />
          </label>
          <fieldset className={styles.methodGroup}>
            <legend>
              <span>Шаг 1</span>
              Способ получения
            </legend>
            <div
              aria-describedby="delivery-method-error"
              aria-invalid={Boolean(errors.deliveryMethod)}
              aria-label="Способ получения"
              className={styles.methodOptions}
              role="radiogroup"
            >
              <label className={styles.methodOption}>
                <input
                  type="radio"
                  value="pickup"
                  {...register("deliveryMethod")}
                />
                <span>
                  <strong>Самовывоз</strong>
                  {configuredPickupDiscount > 0 ? (
                    <small>Скидка {configuredPickupDiscount}%</small>
                  ) : null}
                </span>
              </label>
              <label className={styles.methodOption}>
                <input
                  type="radio"
                  value="courier"
                  {...register("deliveryMethod")}
                />
                <span>
                  <strong>Доставка</strong>
                  <small>
                    {bindShortRussianWords(
                      checkoutSettings.courierDeliveryNote,
                    )}
                  </small>
                </span>
              </label>
            </div>
            <small
              className={styles.methodError}
              id="delivery-method-error"
              aria-live="polite"
            >
              {errors.deliveryMethod?.message ?? "\u00a0"}
            </small>
          </fieldset>

          {deliveryMethod ? (
            <section className={styles.customerStep}>
              <h3>
                <span>Шаг 2</span>
                Данные для заказа
              </h3>
              {deliveryMethod === "pickup" ? (
                <div className={styles.pickupAddress}>
                  <span>Адрес самовывоза</span>
                  <p>{bindShortRussianWords(checkoutSettings.pickupAddress)}</p>
                </div>
              ) : null}
              <Field label="ФИО" error={errors.name?.message}>
                <input
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  maxLength={checkoutFieldLimits.name}
                  type="text"
                  {...register("name")}
                />
              </Field>
              <Field label="Телефон" error={errors.phone?.message}>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      inputRef={field.ref}
                      invalid={Boolean(errors.phone)}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <Field
                label="Email (необязательно)"
                error={errors.email?.message}
              >
                <input
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={Boolean(errors.email)}
                  maxLength={checkoutFieldLimits.email}
                  type="email"
                  {...register("email")}
                />
              </Field>
              {deliveryMethod === "courier" ? (
                <Field
                  label="Адрес доставки"
                  error={errors.deliveryAddress?.message}
                >
                  <AutoResizeTextarea
                    autoComplete="street-address"
                    maxLength={checkoutFieldLimits.deliveryAddress}
                    placeholder="Город, улица, дом, квартира, подъезд"
                    rows={3}
                    aria-invalid={Boolean(errors.deliveryAddress)}
                    {...register("deliveryAddress")}
                  />
                </Field>
              ) : null}
              <Field
                label="Комментарий (необязательно)"
                error={errors.comment?.message}
              >
                <AutoResizeTextarea
                  maxLength={checkoutFieldLimits.comment}
                  rows={3}
                  {...register("comment")}
                />
              </Field>
            </section>
          ) : null}
        </div>

        {deliveryMethod ? (
          <div className={styles.consents}>
            <Checkbox error={errors.privacyConsent?.message}>
              <input type="checkbox" {...register("privacyConsent")} />
              <span>
                {bindShortRussianWords(
                  "Согласен на обработку персональных данных",
                )}
              </span>
            </Checkbox>
            <Checkbox error={errors.termsConsent?.message}>
              <input type="checkbox" {...register("termsConsent")} />
              <span>
                {bindShortRussianWords("Принимаю условия продажи и доставки")}
              </span>
            </Checkbox>
          </div>
        ) : null}

        {deliveryMethod ? (
          <div className={styles.orderSummary}>
            <span>
              Товары, {cart.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
              шт.
            </span>
            <strong
              className={pricing.hasDiscount ? styles.standardTotal : undefined}
            >
              <MoneyAmount
                rubles={standardTotal}
                variant={pricing.hasDiscount ? "previous-total" : "total"}
              />
            </strong>
            {pricing.hasDiscount ? (
              <>
                <span>{bindShortRussianWords("Со скидкой за самовывоз")}</span>
                <strong>
                  <MoneyAmount
                    rubles={pricing.discountedTotal}
                    variant="total"
                  />
                </strong>
              </>
            ) : null}
            {pricing.hasDiscount ? (
              <p>
                {bindShortRussianWords(
                  `Скидка ${pricing.discountPercent}% будет зафиксирована в заказе.`,
                )}
              </p>
            ) : deliveryMethod === "courier" ? (
              <p>
                {bindShortRussianWords(
                  "Стоимость доставки менеджер подтвердит отдельно.",
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {deliveryMethod ? (
          <section className={styles.confirmationStep}>
            <h3>
              <span>Шаг 3</span>
              Подтверждение
            </h3>
            <p>
              {bindShortRussianWords(
                deliveryMethod === "pickup"
                  ? "После отправки формы мы свяжемся с вами, чтобы подтвердить наличие, адрес и время самовывоза и согласовать удобный способ оплаты."
                  : "После отправки формы мы свяжемся с вами, чтобы подтвердить наличие, рассчитать точную стоимость доставки на сегодня и согласовать удобный способ оплаты.",
              )}
            </p>
          </section>
        ) : null}

        {result?.type === "error" ? (
          <p className={styles.submitError} role="alert">
            <AlertCircle aria-hidden="true" />
            {bindShortRussianWords(result.message)}
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
          <span>Подтвердить заказ</span>
        </button>
      </form>
    </ScrollArea>
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
      <span>{bindShortRussianWords(label)}</span>
      {children}
      <small aria-live="polite">
        {error ? bindShortRussianWords(error) : "\u00a0"}
      </small>
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
      <small aria-live="polite">
        {error ? bindShortRussianWords(error) : "\u00a0"}
      </small>
    </label>
  );
}
