import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(5),
});

export const customerDetailsSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.email().optional(),
});

const acceptedConsentSchema = z.object({
  accepted: z.literal(true),
  documentVersion: z.string().trim().min(1),
});

export const orderConsentsSchema = z.object({
  personalData: acceptedConsentSchema,
  salesAndDelivery: acceptedConsentSchema,
});

export const createOrderInputSchema = z.object({
  idempotencyKey: z.uuid(),
  customer: customerDetailsSchema,
  address: z.string().trim().min(1),
  comment: z.string().trim().optional(),
  consents: orderConsentsSchema,
  items: z.array(orderItemInputSchema).min(1),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type OrderConsents = z.infer<typeof orderConsentsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
