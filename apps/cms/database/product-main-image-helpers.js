"use strict";

const TARGET_SEED_KEY = "product-without-image";
const GALLERY_COMPONENT_TYPE = "product.gallery-image";
const MAIN_IMAGE_COMPONENT_TYPE = "shared.image-with-alt";

function componentOrder(link) {
  return typeof link.order === "number" ? link.order : Number.MAX_SAFE_INTEGER;
}

function planProductMainImageCopies({
  products,
  componentLinks,
  galleryImages,
  fileLinks,
}) {
  const galleryById = new Map(galleryImages.map((image) => [image.id, image]));
  const fileByGalleryId = new Map(
    fileLinks
      .filter(
        (link) =>
          link.related_type === GALLERY_COMPONENT_TYPE &&
          link.field === "image",
      )
      .map((link) => [link.related_id, link]),
  );

  return products.flatMap((product) => {
    if (product.seed_key !== TARGET_SEED_KEY) return [];

    const productLinks = componentLinks.filter(
      (link) => link.entity_id === product.id,
    );
    if (productLinks.some((link) => link.field === "mainImage")) return [];

    const firstGalleryLink = productLinks
      .filter(
        (link) =>
          link.field === "gallery" &&
          link.component_type === GALLERY_COMPONENT_TYPE,
      )
      .sort(
        (left, right) =>
          componentOrder(left) - componentOrder(right) || left.id - right.id,
      )[0];
    if (!firstGalleryLink) return [];

    const galleryImage = galleryById.get(firstGalleryLink.cmp_id);
    const fileLink = fileByGalleryId.get(firstGalleryLink.cmp_id);
    if (!galleryImage?.alt?.trim() || !fileLink?.file_id) return [];

    return [
      {
        productId: product.id,
        alt: galleryImage.alt,
        fileId: fileLink.file_id,
        fileOrder: fileLink.order ?? null,
      },
    ];
  });
}

module.exports = {
  GALLERY_COMPONENT_TYPE,
  MAIN_IMAGE_COMPONENT_TYPE,
  TARGET_SEED_KEY,
  planProductMainImageCopies,
};
