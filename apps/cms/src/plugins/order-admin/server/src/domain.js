"use strict";

const { z } = require("zod");

const orderStatusSchema = z.enum([
  "new",
  "confirmed",
  "completed",
  "cancelled",
]);

const storedLineSchema = z
  .object({
    productId: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    packageLabel: z.string().min(1),
    unitPriceRubles: z.number().int().positive(),
    quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    lineTotalRubles: z.number().int().positive(),
    currency: z.literal("RUB"),
    stockRecordId: z.number().int().positive(),
  })
  .passthrough();

const statusHistoryEntrySchema = z
  .object({
    from: orderStatusSchema.nullable(),
    to: orderStatusSchema,
    at: z.string().datetime({ offset: true }),
    actor: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

const consentSchema = z
  .object({
    accepted: z.literal(true),
    documentVersion: z.string().min(1),
  })
  .strict();

const storedOrderSchema = z
  .object({
    documentId: z.string().min(1),
    orderNumber: z.string().min(1),
    orderStatus: orderStatusSchema,
    customerName: z.string().min(1),
    customerPhone: z.string().min(1),
    customerEmail: z.string().email().nullable().optional(),
    deliveryMethod: z.enum(["pickup", "courier"]),
    deliveryAddress: z.string().min(1),
    pickupDiscountPercent: z.number().int().min(0).max(100),
    comment: z.string().nullable().optional(),
    managerComment: z.string().nullable().optional(),
    consents: z.object({
      personalData: consentSchema,
      salesAndDelivery: consentSchema,
    }),
    lines: z.array(storedLineSchema).min(1),
    currency: z.literal("RUB"),
    totalRubles: z.number().int().positive(),
    discountedTotalRubles: z.number().int().nonnegative(),
    statusHistory: z.array(statusHistoryEntrySchema).min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .passthrough();

const inquiryStatusSchema = z.enum(["new", "processed"]);

const listPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  createdFrom: z.string().datetime({ offset: true }).optional(),
  createdTo: z.string().datetime({ offset: true }).optional(),
});

const listDateRangeRefine = (value) =>
  !value.createdFrom ||
  !value.createdTo ||
  value.createdFrom <= value.createdTo;

const listQuerySchema = listPaginationSchema
  .extend({
    status: orderStatusSchema.optional(),
  })
  .strict()
  .refine(listDateRangeRefine, {
    message: "createdFrom must not be after createdTo",
    path: ["createdFrom"],
  });

const inquiryListQuerySchema = listPaginationSchema
  .extend({
    status: inquiryStatusSchema.optional(),
  })
  .strict()
  .refine(listDateRangeRefine, {
    message: "createdFrom must not be after createdTo",
    path: ["createdFrom"],
  });

const statusCommandSchema = z
  .object({
    status: orderStatusSchema,
  })
  .strict();

const inquiryStatusCommandSchema = z
  .object({
    status: inquiryStatusSchema,
  })
  .strict();

const editCommandSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    deliveryAddress: z.string().trim().min(1).max(500),
    managerComment: z.string().trim().max(2000).nullable(),
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1).max(100),
            quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const productIds = new Set();
    for (const [index, item] of items.entries()) {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate product",
          path: ["items", index, "productId"],
        });
      }
      productIds.add(item.productId);
    }
  });

const productQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
  })
  .strict();

const productOptionSchema = z
  .object({
    documentId: z.string().min(1),
    title: z.string().min(1),
    displayName: z.string().min(1),
    packageLabel: z.string().min(1),
    price: z.number().int().positive(),
    stock: z.number().int().nonnegative(),
  })
  .passthrough();

const documentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);

const allowedStatusTargets = {
  new: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const allowedInquiryStatusTargets = {
  new: ["processed"],
  processed: ["new"],
};

const storedInquirySchema = z
  .object({
    documentId: z.string().min(1),
    customerName: z.string().min(1),
    customerPhone: z.string().min(1),
    customerEmail: z.string().email(),
    comment: z.string().nullable().optional(),
    source: z.string().min(1),
    modelInterest: z.string().nullable().optional(),
    inquiryStatus: inquiryStatusSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .passthrough();

function lineDto(line) {
  return {
    productId: line.productId,
    slug: line.slug,
    title: line.title,
    packageLabel: line.packageLabel,
    unitPriceRubles: line.unitPriceRubles,
    quantity: line.quantity,
    lineTotalRubles: line.lineTotalRubles,
    currency: line.currency,
  };
}

function mapOrderListItem(rawOrder) {
  const order = storedOrderSchema.parse(rawOrder);
  return {
    documentId: order.documentId,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    status: order.orderStatus,
    lineCount: order.lines.length,
    unitCount: order.lines.reduce(
      (quantity, line) => quantity + line.quantity,
      0,
    ),
    currency: order.currency,
    totalRubles: order.totalRubles,
    discountedTotalRubles: order.discountedTotalRubles,
  };
}

function mapOrderDetail(rawOrder) {
  const order = storedOrderSchema.parse(rawOrder);
  return {
    ...mapOrderListItem(order),
    updatedAt: order.updatedAt,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail ?? null,
    },
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    pickupDiscountPercent: order.pickupDiscountPercent,
    discountedTotalRubles: order.discountedTotalRubles,
    comment: order.comment ?? null,
    managerComment: order.managerComment ?? null,
    lines: order.lines.map(lineDto),
    consents: {
      personalData: order.consents.personalData,
      salesAndDelivery: order.consents.salesAndDelivery,
    },
    statusHistory: order.statusHistory,
    availableStatusTransitions: allowedStatusTargets[order.orderStatus],
    editable: ["new", "confirmed"].includes(order.orderStatus),
  };
}

function mapInquiryListItem(rawInquiry) {
  const inquiry = storedInquirySchema.parse(rawInquiry);
  return {
    documentId: inquiry.documentId,
    createdAt: inquiry.createdAt,
    customerName: inquiry.customerName,
    customerPhone: inquiry.customerPhone,
    customerEmail: inquiry.customerEmail,
    modelInterest: inquiry.modelInterest ?? null,
    source: inquiry.source,
    status: inquiry.inquiryStatus,
  };
}

function mapInquiryDetail(rawInquiry) {
  const inquiry = storedInquirySchema.parse(rawInquiry);
  return {
    ...mapInquiryListItem(inquiry),
    updatedAt: inquiry.updatedAt,
    comment: inquiry.comment ?? null,
    availableStatusTransitions:
      allowedInquiryStatusTargets[inquiry.inquiryStatus],
  };
}

function mapProductOption(rawProduct) {
  const product = productOptionSchema.parse(rawProduct);
  return {
    productId: product.documentId,
    technicalName: product.title,
    displayName: product.displayName,
    packageLabel: product.packageLabel,
    priceRubles: product.price,
    stock: product.stock,
  };
}

function parseListQuery(value) {
  return listQuerySchema.parse(value);
}

function parseInquiryListQuery(value) {
  return inquiryListQuerySchema.parse(value);
}

function parseStatusCommand(value) {
  return statusCommandSchema.parse(value);
}

function parseInquiryStatusCommand(value) {
  return inquiryStatusCommandSchema.parse(value);
}

function parseEditCommand(value) {
  return editCommandSchema.parse(value);
}

function parseProductQuery(value) {
  return productQuerySchema.parse(value);
}

function parseDocumentId(value) {
  return documentIdSchema.parse(value);
}

module.exports = {
  mapInquiryDetail,
  mapInquiryListItem,
  mapOrderDetail,
  mapOrderListItem,
  mapProductOption,
  orderStatusSchema,
  parseDocumentId,
  parseInquiryListQuery,
  parseInquiryStatusCommand,
  parseListQuery,
  parseEditCommand,
  parseProductQuery,
  parseStatusCommand,
};
