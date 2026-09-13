import type { InquiryPayload } from "./validation.ts";

export type InquiryResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface InquiryClient {
  prepare?(): Promise<void>;
  submit(input: {
    source: string;
    customer: InquiryPayload;
    honeypot: boolean;
  }): Promise<InquiryResult>;
}

export const INQUIRY_SUCCESS_MESSAGE =
  "С вами свяжется менеджер в ближайшее время.";

export function createFakeInquiryClient(
  result: InquiryResult = { ok: true, message: INQUIRY_SUCCESS_MESSAGE },
): InquiryClient {
  return {
    async prepare() {},
    async submit() {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return result;
    },
  };
}

export function createFetchInquiryClient({
  minimumFillMs = 1_550,
  now = Date.now,
  sleep = (duration: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, duration)),
}: {
  minimumFillMs?: number;
  now?: () => number;
  sleep?: (duration: number) => Promise<void>;
} = {}): InquiryClient {
  let formToken: string | undefined;
  let formReadyAt = 0;

  const prepare = async () => {
    if (formToken) return;
    const response = await fetch("/api/inquiries", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = (await response.json()) as { formToken?: string };
    if (!response.ok || !body.formToken) {
      throw new Error("Форма временно недоступна.");
    }
    formToken = body.formToken;
    formReadyAt = now() + minimumFillMs;
  };

  return {
    prepare,
    async submit({ source, customer, honeypot }) {
      try {
        await prepare();
        const remainingFillTime = formReadyAt - now();
        if (remainingFillTime > 0) await sleep(remainingFillTime);
        const response = await fetch("/api/inquiries", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formToken,
            honeypot,
            inquiry: {
              customerName: customer.name,
              customerPhone: customer.phone,
              customerEmail: customer.email,
              ...(customer.comment ? { comment: customer.comment } : {}),
              source,
              ...(customer.modelInterest
                ? { modelInterest: customer.modelInterest }
                : {}),
              privacyConsent: true,
            },
          }),
        });
        const body = (await response.json()) as {
          id?: string;
          error?: { message?: string };
        };
        if (!response.ok || !body.id) {
          return {
            ok: false,
            message:
              body.error?.message ??
              "Не удалось отправить заявку. Попробуйте ещё раз.",
          };
        }

        formToken = undefined;
        return { ok: true, message: INQUIRY_SUCCESS_MESSAGE };
      } catch {
        return {
          ok: false,
          message: "Не удалось связаться с сервисом заявок. Попробуйте позже.",
        };
      }
    },
  };
}
