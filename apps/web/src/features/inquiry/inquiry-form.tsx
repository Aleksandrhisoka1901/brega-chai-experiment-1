"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFieldLimits } from "@brega-chai/contracts";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AutoResizeTextarea } from "@/components/auto-resize-textarea";
import { bindShortRussianWords } from "@/lib/typography";

import { METRIKA_GOALS, reachMetrikaGoal } from "../analytics/goals";
import { PhoneInput } from "../checkout/phone-input";
import {
  createFetchInquiryClient,
  INQUIRY_SUCCESS_MESSAGE,
  type InquiryClient,
} from "./client";
import styles from "./inquiry-form.module.css";
import {
  inquirySchema,
  type InquiryField,
  type InquiryFormValues,
  type InquiryPayload,
} from "./validation";

const defaults: InquiryFormValues = {
  name: "",
  phone: "",
  email: "",
  comment: "",
  modelInterest: "",
  privacyConsent: false,
};

export type InquiryFormModel = {
  id: string;
  name: string;
};

export function InquiryForm({
  source,
  heading = "Хотите узнать подробности?",
  description = "Оставьте контакты — с вами свяжется менеджер в ближайшее время.",
  submitLabel = "Отправить заявку",
  toggleLabel = "Оставить заявку",
  models,
  defaultModel,
  collapsedByDefault = true,
  expanded,
  onExpandedChange,
  onModelChange,
  id = "inquiry",
  className,
  client,
}: {
  source: string;
  heading?: string;
  description?: string;
  submitLabel?: string;
  toggleLabel?: string;
  models?: readonly InquiryFormModel[];
  defaultModel?: string;
  collapsedByDefault?: boolean;
  expanded?: boolean;
  onExpandedChange?(open: boolean): void;
  onModelChange?(name: string): void;
  id?: string;
  className?: string;
  client?: InquiryClient;
}) {
  const inquiryClient = useMemo(
    () => client ?? createFetchInquiryClient(),
    [client],
  );
  const [result, setResult] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >();
  const [honeypot, setHoneypot] = useState(false);
  const [internalOpen, setInternalOpen] = useState(!collapsedByDefault);
  const [isPreparing, setIsPreparing] = useState(false);
  const submittingRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const open = expanded ?? internalOpen;
  const wasOpen = useRef(open);
  const setOpen = onExpandedChange ?? setInternalOpen;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues, unknown, InquiryPayload>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      ...defaults,
      modelInterest: defaultModel ?? "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    setValue("modelInterest", defaultModel ?? "");
    if (defaultModel && expanded === undefined) setInternalOpen(true);
  }, [defaultModel, expanded, open, setValue]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsPreparing(true);
    Promise.resolve(inquiryClient.prepare?.())
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
  }, [inquiryClient, open]);

  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened) return;

    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const frame = window.requestAnimationFrame(() => {
      setFocus(models && models.length > 0 ? "modelInterest" : "name");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, models, setFocus]);

  if (result?.type === "success") {
    return (
      <section
        className={`${styles.section}${className ? ` ${className}` : ""}`}
        data-inquiry-form
        id={id}
        ref={sectionRef}
      >
        <h2>{bindShortRussianWords(heading)}</h2>
        <p className={styles.result} role="status">
          {bindShortRussianWords(result.message)}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.section}${className ? ` ${className}` : ""}`}
      data-inquiry-form
      id={id}
      ref={sectionRef}
    >
      {open ? (
      <>
      <header className={styles.panelHead}>
        <div>
          <h2>{bindShortRussianWords(heading)}</h2>
          <p className={styles.lead}>{bindShortRussianWords(description)}</p>
        </div>
        <button
          className={styles.collapse}
          type="button"
          onClick={() => setOpen(false)}
        >
          {bindShortRussianWords("Свернуть")}
        </button>
      </header>
      <form
        id={`${id}-fields`}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit(
          async (values) => {
            if (submittingRef.current) return;
            submittingRef.current = true;
            setResult(undefined);
            try {
              const response = await inquiryClient.submit({
                source,
                customer: values,
                honeypot,
              });
              if (response.ok) {
                reachMetrikaGoal(METRIKA_GOALS.inquirySubmit, { source });
                setResult({
                  type: "success",
                  message: response.message || INQUIRY_SUCCESS_MESSAGE,
                });
              } else {
                setResult({ type: "error", message: response.message });
              }
            } finally {
              submittingRef.current = false;
            }
          },
          (invalid) => {
            const first = Object.keys(invalid)[0] as InquiryField | undefined;
            if (first) setFocus(first);
          },
        )}
      >
        <input
          className={styles.honeypot}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          name="company"
          onChange={(event) => setHoneypot(event.currentTarget.value.length > 0)}
        />
        {models && models.length > 0 ? (
          <label className={styles.field}>
            <span>{bindShortRussianWords("Какая система интересует")}</span>
            <select
              {...register("modelInterest")}
              onChange={(event) => {
                void register("modelInterest").onChange(event);
                onModelChange?.(event.currentTarget.value);
              }}
            >
              <option value="">Пока не знаю</option>
              {models.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <small aria-live="polite">
              {errors.modelInterest?.message
                ? bindShortRussianWords(errors.modelInterest.message)
                : "\u00a0"}
            </small>
          </label>
        ) : null}
        <label className={styles.field}>
          <span>{bindShortRussianWords("Имя")}</span>
          <input
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            maxLength={checkoutFieldLimits.name}
            type="text"
            {...register("name")}
          />
          <small aria-live="polite">
            {errors.name?.message
              ? bindShortRussianWords(errors.name.message)
              : "\u00a0"}
          </small>
        </label>
        <label className={styles.field}>
          <span>{bindShortRussianWords("Телефон")}</span>
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
          <small aria-live="polite">
            {errors.phone?.message
              ? bindShortRussianWords(errors.phone.message)
              : "\u00a0"}
          </small>
        </label>
        <label className={styles.field}>
          <span>{bindShortRussianWords("Email")}</span>
          <input
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            maxLength={checkoutFieldLimits.email}
            type="email"
            {...register("email")}
          />
          <small aria-live="polite">
            {errors.email?.message
              ? bindShortRussianWords(errors.email.message)
              : "\u00a0"}
          </small>
        </label>
        <label className={styles.field}>
          <span>{bindShortRussianWords("Комментарий (необязательно)")}</span>
          <AutoResizeTextarea
            maxLength={checkoutFieldLimits.comment}
            rows={3}
            {...register("comment")}
          />
          <small aria-live="polite">
            {errors.comment?.message
              ? bindShortRussianWords(errors.comment.message)
              : "\u00a0"}
          </small>
        </label>
        <label className={styles.checkbox}>
          <span className={styles.checkboxLine}>
            <input type="checkbox" {...register("privacyConsent")} />
            <span>
              {bindShortRussianWords("Согласен на обработку ")}
              <a href="/legal/privacy.pdf" rel="noopener noreferrer" target="_blank">
                персональных данных
              </a>
            </span>
          </span>
          <small aria-live="polite">
            {errors.privacyConsent?.message
              ? bindShortRussianWords(errors.privacyConsent.message)
              : "\u00a0"}
          </small>
        </label>
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
          <span>{bindShortRussianWords(submitLabel)}</span>
        </button>
      </form>
      </>
      ) : (
      <div className={styles.invite}>
        <button
          aria-controls={`${id}-fields`}
          aria-expanded={false}
          className={styles.cta}
          type="button"
          onClick={() => setOpen(true)}
        >
          {bindShortRussianWords(toggleLabel)}
        </button>
        <p className={styles.caption}>{bindShortRussianWords(description)}</p>
      </div>
      )}
    </section>
  );
}
