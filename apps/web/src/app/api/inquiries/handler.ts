import { verifyFormToken } from "../checkout/orders/domain.ts";
import { parseBrowserInquiryRequest } from "./domain.ts";

const STRAPI_TIMEOUT_MS = 7_000;

type FetchBoundary = (request: Request) => Promise<Response>;

export interface InquiryHandlerDependencies {
  secret: string;
  strapiUrl: string;
  strapiToken: string;
  now?: () => number;
  fetch?: FetchBoundary;
  timeoutMs?: number;
}

function safeError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function handleCreateInquiry(
  request: Request,
  dependencies: InquiryHandlerDependencies,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError(400, "INVALID_REQUEST", "Проверьте данные формы.");
  }

  const parsed = parseBrowserInquiryRequest(body);
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
      reject(new DOMException("Inquiry service timed out", "AbortError"));
    }, dependencies.timeoutMs ?? STRAPI_TIMEOUT_MS);
  });

  try {
    const upstream = await Promise.race([
      (dependencies.fetch ?? fetch)(
        new Request(new URL("/api/inquiries", dependencies.strapiUrl), {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${dependencies.strapiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data.inquiry),
          signal: controller.signal,
        }),
      ),
      timeoutPromise,
    ]);

    if (!upstream.ok) {
      if (upstream.status === 400 || upstream.status === 422) {
        return safeError(
          upstream.status,
          "INQUIRY_REJECTED",
          "Проверьте данные формы.",
        );
      }
      return safeError(
        503,
        "INQUIRY_SERVICE_UNAVAILABLE",
        "Не удалось отправить заявку. Попробуйте позже.",
      );
    }

    const envelope = (await upstream.json()) as { data?: { id?: unknown } };
    if (typeof envelope.data?.id !== "string" || !envelope.data.id) {
      return safeError(
        503,
        "INVALID_INQUIRY_RESPONSE",
        "Не удалось подтвердить отправку заявки.",
      );
    }

    return Response.json({ id: envelope.data.id }, { status: 201 });
  } catch {
    return safeError(
      504,
      "INQUIRY_SERVICE_TIMEOUT",
      "Сервис не ответил вовремя. Повторите попытку.",
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
