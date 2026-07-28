import { z } from "zod";

import type { CheckoutFormValues } from "./validation.ts";

export const CHECKOUT_DRAFT_KEY = "brega-chai:checkout-draft:v1";

const draftSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    deliveryAddress: z.string().optional(),
    comment: z.string().optional(),
  })
  .strict();

export type CheckoutDraft = z.infer<typeof draftSchema>;

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createCheckoutDraftPersistence(storage?: SessionStorageLike) {
  return {
    load(): CheckoutDraft {
      const raw = storage?.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return {};
      try {
        const parsed = draftSchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
      } catch {
        // The corrupted value is removed below.
      }
      storage?.removeItem(CHECKOUT_DRAFT_KEY);
      return {};
    },
    save(values: CheckoutFormValues) {
      const draft: CheckoutDraft = {
        name: values.name,
        phone: values.phone,
        email: values.email,
        deliveryAddress: values.deliveryAddress,
        comment: values.comment,
      };
      storage?.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    },
    clear() {
      storage?.removeItem(CHECKOUT_DRAFT_KEY);
    },
  };
}

export function createBrowserCheckoutDraftPersistence() {
  return createCheckoutDraftPersistence(
    typeof window === "undefined" ? undefined : window.sessionStorage,
  );
}
