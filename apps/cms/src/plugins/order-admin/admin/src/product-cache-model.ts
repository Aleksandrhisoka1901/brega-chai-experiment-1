const PRODUCT_UID = "api::product.product";

export const productCacheTags = [
  { type: "Document" as const, id: `${PRODUCT_UID}_LIST` },
  { type: "Document" as const, id: `${PRODUCT_UID}_ALL_ITEMS` },
];
