import assert from "node:assert/strict";
import test from "node:test";

import {
  GALLERY_COMPONENT_TYPE,
  MAIN_IMAGE_COMPONENT_TYPE,
  TARGET_SEED_KEY,
  planProductMainImageCopies,
} from "../database/product-main-image-helpers.js";

const products = [
  { id: 7, seed_key: TARGET_SEED_KEY },
  { id: 199, seed_key: TARGET_SEED_KEY },
  { id: 42, seed_key: "another-product" },
];
const galleryImages = [
  { id: 501, alt: "Первое изображение" },
  { id: 502, alt: "Второе изображение" },
  { id: 503, alt: "Чужое изображение" },
];
const fileLinks = [
  {
    file_id: 14,
    related_id: 501,
    related_type: GALLERY_COMPONENT_TYPE,
    field: "image",
    order: 1,
  },
  {
    file_id: 15,
    related_id: 502,
    related_type: GALLERY_COMPONENT_TYPE,
    field: "image",
    order: 1,
  },
  {
    file_id: 16,
    related_id: 503,
    related_type: GALLERY_COMPONENT_TYPE,
    field: "image",
    order: 1,
  },
];

test("plans a main image for both draft and published target rows", () => {
  const copies = planProductMainImageCopies({
    products,
    componentLinks: [
      {
        id: 2,
        entity_id: 7,
        cmp_id: 502,
        component_type: GALLERY_COMPONENT_TYPE,
        field: "gallery",
        order: 2,
      },
      {
        id: 1,
        entity_id: 7,
        cmp_id: 501,
        component_type: GALLERY_COMPONENT_TYPE,
        field: "gallery",
        order: 1,
      },
      {
        id: 3,
        entity_id: 199,
        cmp_id: 501,
        component_type: GALLERY_COMPONENT_TYPE,
        field: "gallery",
        order: 1,
      },
      {
        id: 4,
        entity_id: 42,
        cmp_id: 503,
        component_type: GALLERY_COMPONENT_TYPE,
        field: "gallery",
        order: 1,
      },
    ],
    galleryImages,
    fileLinks,
  });

  assert.deepEqual(copies, [
    { productId: 7, alt: "Первое изображение", fileId: 14, fileOrder: 1 },
    { productId: 199, alt: "Первое изображение", fileId: 14, fileOrder: 1 },
  ]);
});

test("is idempotent and never replaces an existing main image", () => {
  const componentLinks = products
    .filter((product) => product.seed_key === TARGET_SEED_KEY)
    .flatMap((product, index) => [
      {
        id: index + 1,
        entity_id: product.id,
        cmp_id: 501,
        component_type: GALLERY_COMPONENT_TYPE,
        field: "gallery",
        order: 1,
      },
      {
        id: index + 10,
        entity_id: product.id,
        cmp_id: 900 + index,
        component_type: MAIN_IMAGE_COMPONENT_TYPE,
        field: "mainImage",
        order: null,
      },
    ]);

  assert.deepEqual(
    planProductMainImageCopies({
      products,
      componentLinks,
      galleryImages,
      fileLinks,
    }),
    [],
  );
});

test("skips incomplete galleries without creating partial components", () => {
  const galleryLink = {
    id: 1,
    entity_id: 7,
    cmp_id: 501,
    component_type: GALLERY_COMPONENT_TYPE,
    field: "gallery",
    order: 1,
  };

  assert.deepEqual(
    planProductMainImageCopies({
      products: [products[0]],
      componentLinks: [galleryLink],
      galleryImages: [{ id: 501, alt: "" }],
      fileLinks,
    }),
    [],
  );
  assert.deepEqual(
    planProductMainImageCopies({
      products: [products[0]],
      componentLinks: [galleryLink],
      galleryImages,
      fileLinks: [],
    }),
    [],
  );
});
