import { orderResultSchema, type OrderResult } from "@brega-chai/contracts";

import { parseBrowserOrderRequest, verifyFormToken } from "./domain.ts";

const STRAPI_TIMEOUT_MS = 7_000;

type FetchBoundary = (request: Request) => Promise<Response>;

export interface OrderHandlerDependencies {
  secret: string;
  strapiUrl: string;
  strapiToken: string;
  now?: () => number;
  fetch?: FetchBoundary;
  onOrderAccepted?: (order: OrderResult) => void;
  timeoutMs?: number;
}

function safeError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

async function readUpstreamErrorCode(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { code?: unknown };
    };
    return typeof body.error?.code === "string" ? body.error.code : undefined;
  } catch {
    return undefined;
  }
}

export async function handleCreateOrder(
  request: Request,
  dependencies: OrderHandlerDependencies,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError(400, "INVALID_REQUEST", "Проверьте данные формы.");
  }

  const parsed = parseBrowserOrderRequest(body);
  if (!parsed.success) {
    return safeError(400, "INVALID_REQUEST", "Проверьте данные формы.");
  }
  if (parsed.data.honeypot) {
    return safeError(400, "INVALID_REQUEST", "Проверьте данные формы.");
  }

  const token = verifyFormToken(parsed.data.formToken, {
    secret: dependencies.secret,
    now: dependencies.now?.() ?? Date.now(),
  });
  if (!token.ok) {
    return token.reason === "too-fast"
      ? safeError(429, "TOO_FAST", "Попробуйте отправить форму ещё раз.")
      : safeError(
          400,
          "INVALID_FORM_TOKEN",
          "Обновите форму и попробуйте снова.",
        );
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new DOMException("Order service timed out", "AbortError"));
    }, dependencies.timeoutMs ?? STRAPI_TIMEOUT_MS);
  });

  try {
    const upstream = await Promise.race([
      (dependencies.fetch ?? fetch)(
        new Request(new URL("/api/orders", dependencies.strapiUrl), {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${dependencies.strapiToken}`,
            "Content-Type": "application/json",
            "Idempotency-Key": parsed.data.order.idempotencyKey,
          },
          body: JSON.stringify(parsed.data.order),
          signal: controller.signal,
        }),
      ),
      timeoutPromise,
    ]);

    if (!upstream.ok) {
      const upstreamCode = await readUpstreamErrorCode(upstream);
      if (upstream.status === 409 && upstreamCode === "IDEMPOTENCY_CONFLICT") {
        return safeError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Заказ уже обрабатывается.",
        );
      }
      if (upstream.status === 409 && upstreamCode === "INSUFFICIENT_STOCK") {
        return safeError(
          409,
          "INSUFFICIENT_STOCK",
          "Некоторых товаров уже нет в нужном количестве. Проверьте корзину.",
        );
      }
      if (
        upstream.status === 409 &&
        (upstreamCode === "PRODUCT_NOT_FOUND" ||
          upstreamCode === "PRODUCT_UNAVAILABLE")
      ) {
        return safeError(
          409,
          "PRODUCT_UNAVAILABLE",
          "Некоторые товары больше недоступны. Проверьте корзину.",
        );
      }
      if (upstream.status === 400 || upstream.status === 422) {
        return safeError(
          upstream.status,
          "ORDER_REJECTED",
          "Проверьте состав корзины и данные заказа.",
        );
      }
      if (upstream.status === 409) {
        return safeError(
          409,
          "ORDER_REJECTED",
          "Проверьте состав корзины и данные заказа.",
        );
      }
      return safeError(
        503,
        "ORDER_SERVICE_UNAVAILABLE",
        "Не удалось создать заказ. Попробуйте позже.",
      );
    }

    const envelope = (await upstream.json()) as { data?: unknown };
    const result = orderResultSchema.safeParse(envelope.data);
    if (!result.success) {
      return safeError(
        503,
        "INVALID_ORDER_RESPONSE",
        "Не удалось подтвердить создание заказа.",
      );
    }
    dependencies.onOrderAccepted?.(result.data);
    return Response.json(result.data, { status: upstream.status });
  } catch {
    return safeError(
      504,
      "ORDER_SERVICE_TIMEOUT",
      "Сервис не ответил вовремя. Повторите попытку.",
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
