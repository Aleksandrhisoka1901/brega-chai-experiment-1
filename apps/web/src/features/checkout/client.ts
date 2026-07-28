import type { CartItem } from "../cart/types";
import type { CheckoutPayload } from "./validation";

export type CheckoutResult =
  | { ok: true; orderNumber: string; message: string }
  | { ok: false; message: string };

export interface CheckoutClient {
  prepare?(): Promise<void>;
  submit(input: {
    customer: CheckoutPayload;
    items: CartItem[];
    honeypot: string;
  }): Promise<CheckoutResult>;
}

export function createFakeCheckoutClient(
  result: CheckoutResult = {
    ok: true,
    orderNumber: "TEST-0001",
    message: "Заявка принята. Менеджер свяжется с вами для подтверждения.",
  },
): CheckoutClient {
  return {
    async prepare() {},
    async submit() {
      await new Promise((resolve) => setTimeout(resolve, 450));
      return result;
    },
  };
}

export function createFetchCheckoutClient({
  minimumFillMs = 1_550,
  now = Date.now,
  sleep = (duration: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, duration)),
}: {
  minimumFillMs?: number;
  now?: () => number;
  sleep?: (duration: number) => Promise<void>;
} = {}): CheckoutClient {
  let formToken: string | undefined;
  let formReadyAt = 0;
  let idempotencyKey = crypto.randomUUID();

  const prepare = async () => {
    if (formToken) return;
    const response = await fetch("/api/checkout/orders", {
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
    async submit({ customer, items, honeypot }) {
      try {
        await prepare();
        const remainingFillTime = formReadyAt - now();
        if (remainingFillTime > 0) await sleep(remainingFillTime);
        const response = await fetch("/api/checkout/orders", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formToken,
            honeypot,
            order: {
              idempotencyKey,
              customer: {
                name: customer.name,
                phone: customer.phone,
                ...(customer.email ? { email: customer.email } : {}),
              },
              deliveryAddress: customer.deliveryAddress,
              ...(customer.comment ? { comment: customer.comment } : {}),
              consents: {
                personalData: {
                  accepted: true,
                  documentVersion: "2026-07-28",
                },
                salesAndDelivery: {
                  accepted: true,
                  documentVersion: "2026-07-28",
                },
              },
              items: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          }),
        });
        const body = (await response.json()) as {
          orderId?: string;
          error?: { message?: string };
        };
        if (!response.ok || !body.orderId) {
          return {
            ok: false,
            message:
              body.error?.message ??
              "Не удалось создать заявку. Попробуйте ещё раз.",
          };
        }

        const orderNumber = body.orderId;
        idempotencyKey = crypto.randomUUID();
        formToken = undefined;
        return {
          ok: true,
          orderNumber,
          message:
            "Заявка принята. Менеджер свяжется с вами для подтверждения.",
        };
      } catch {
        return {
          ok: false,
          message: "Не удалось связаться с сервисом заказов. Попробуйте позже.",
        };
      }
    },
  };
}
