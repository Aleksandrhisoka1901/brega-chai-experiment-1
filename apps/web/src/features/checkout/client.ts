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
    honeypot: boolean;
  }): Promise<CheckoutResult>;
}

interface IdempotencyCryptoSource {
  randomUUID?: () => string;
  getRandomValues(target: Uint8Array): Uint8Array;
}

export function createIdempotencyKey(
  source: IdempotencyCryptoSource = globalThis.crypto,
): string {
  if (typeof source.randomUUID === "function") {
    return source.randomUUID();
  }

  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createFakeCheckoutClient(
  result: CheckoutResult = {
    ok: true,
    orderNumber: "2607-0001",
    message: "Менеджер свяжется с вами для подтверждения.",
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
  let idempotencyKey = createIdempotencyKey();

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
              deliveryMethod: customer.deliveryMethod,
              ...(customer.deliveryMethod === "courier"
                ? { deliveryAddress: customer.deliveryAddress }
                : {}),
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
          orderNumber?: string;
          error?: { message?: string };
        };
        if (!response.ok || !body.orderId || !body.orderNumber) {
          return {
            ok: false,
            message:
              body.error?.message ??
              "Не удалось создать заказ. Попробуйте ещё раз.",
          };
        }

        idempotencyKey = createIdempotencyKey();
        formToken = undefined;
        return {
          ok: true,
          orderNumber: body.orderNumber,
          message:
            "Менеджер свяжется с вами, чтобы подтвердить наличие и согласовать оплату.",
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
