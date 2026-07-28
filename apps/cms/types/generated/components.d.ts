import type { Schema, Struct } from "@strapi/strapi";

export interface HomeCatalogPreview extends Struct.ComponentSchema {
  collectionName: "components_home_catalog_previews";
  info: {
    description: "Keep headings and short announcements concise; length guidance is editorial, not a validation error.";
    displayName: "Catalog preview";
  };
  attributes: {
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface HomeEditorialSection extends Struct.ComponentSchema {
  collectionName: "components_home_editorial_sections";
  info: {
    description: "About section with optional image and custom colors";
    displayName: "Editorial section";
  };
  attributes: {
    backgroundColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<"plugin::color-picker.color">;
    image: Schema.Attribute.Component<"shared.image-with-alt", false>;
    spacing: Schema.Attribute.Enumeration<["S", "M", "L", "XL"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"L">;
    text: Schema.Attribute.Blocks & Schema.Attribute.Required;
    textColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<"plugin::color-picker.color">;
  };
}

export interface HomeHero extends Struct.ComponentSchema {
  collectionName: "components_home_heroes";
  info: {
    description: "Image and alt are required unless layout is 100/0";
    displayName: "Hero";
  };
  attributes: {
    backgroundColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<"plugin::color-picker.color">;
    cta: Schema.Attribute.Component<"shared.link", false>;
    image: Schema.Attribute.Component<"shared.image-with-alt", false>;
    layout: Schema.Attribute.Enumeration<["50/50", "40/60", "100/0"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"50/50">;
    text: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    textColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<"plugin::color-picker.color">;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface ProductGalleryImage extends Struct.ComponentSchema {
  collectionName: "components_product_gallery_images";
  info: {
    description: "Every gallery image requires meaningful alt text. Image dimensions are recommendations; only file weight is enforced.";
    displayName: "Gallery image";
  };
  attributes: {
    alt: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    image: Schema.Attribute.Media<"images"> & Schema.Attribute.Required;
  };
}

export interface SharedImageWithAlt extends Struct.ComponentSchema {
  collectionName: "components_shared_images_with_alt";
  info: {
    description: "Upload an image and add a concise, meaningful alt description. Recommended image sizes are documented for editors; only file weight is enforced.";
    displayName: "Image with alt";
  };
  attributes: {
    alt: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    image: Schema.Attribute.Media<"images"> & Schema.Attribute.Required;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: "components_shared_links";
  info: {
    displayName: "Link";
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    url: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2048;
        minLength: 1;
      }>;
  };
}

export interface SharedNavigationLabels extends Struct.ComponentSchema {
  collectionName: "components_shared_navigation_labels";
  info: {
    displayName: "Navigation labels";
  };
  attributes: {
    about: Schema.Attribute.String & Schema.Attribute.Required;
    cart: Schema.Attribute.String & Schema.Attribute.Required;
    products: Schema.Attribute.String & Schema.Attribute.Required;
    rituals: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: "components_shared_seos";
  info: {
    description: "Search metadata. Keep the title and description concise; these are recommendations, not validation limits.";
    displayName: "SEO";
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<"images">;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ComponentSchemas {
      "home.catalog-preview": HomeCatalogPreview;
      "home.editorial-section": HomeEditorialSection;
      "home.hero": HomeHero;
      "product.gallery-image": ProductGalleryImage;
      "shared.image-with-alt": SharedImageWithAlt;
      "shared.link": SharedLink;
      "shared.navigation-labels": SharedNavigationLabels;
      "shared.seo": SharedSeo;
    }
  }
}
