import { createHmac, timingSafeEqual } from "node:crypto";

import { createOrderInputSchema } from "@brega-chai/contracts";
import { z } from "zod";

const browserOrderRequestSchema = z
  .object({
    formToken: z.string().min(1),
    honeypot: z.boolean(),
    order: createOrderInputSchema,
  })
  .strict();

export const parseBrowserOrderRequest = (value: unknown) =>
  browserOrderRequestSchema.safeParse(value);

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createFormToken({
  secret,
  now = Date.now(),
  nonce = crypto.randomUUID(),
}: {
  secret: string;
  now?: number;
  nonce?: string;
}) {
  const payload = `${now}.${nonce}`;
  return `${Buffer.from(payload).toString("base64url")}.${signature(payload, secret)}`;
}

export function verifyFormToken(
  token: string,
  {
    secret,
    now = Date.now(),
    minimumAgeMs = 1_500,
    maximumAgeMs = 7_200_000,
  }: {
    secret: string;
    now?: number;
    minimumAgeMs?: number;
    maximumAgeMs?: number;
  },
): { ok: true } | { ok: false; reason: "invalid" | "too-fast" | "expired" } {
  try {
    const [encodedPayload, suppliedSignature, extra] = token.split(".");
    if (!encodedPayload || !suppliedSignature || extra) {
      return { ok: false, reason: "invalid" };
    }

    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expected = signature(payload, secret);
    const suppliedBuffer = Buffer.from(suppliedSignature);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return { ok: false, reason: "invalid" };
    }

    const [issuedAtText, nonce, payloadExtra] = payload.split(".");
    const issuedAt = Number(issuedAtText);
    if (!Number.isSafeInteger(issuedAt) || !nonce || payloadExtra) {
      return { ok: false, reason: "invalid" };
    }

    const age = now - issuedAt;
    if (age < minimumAgeMs) return { ok: false, reason: "too-fast" };
    if (age > maximumAgeMs) return { ok: false, reason: "expired" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
