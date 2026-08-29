import type { Schema, Struct } from '@strapi/strapi';

export interface ArticleCard extends Struct.ComponentSchema {
  collectionName: 'components_article_cards';
  info: {
    description: '\u041E\u0434\u043D\u0430 \u044F\u0447\u0435\u0439\u043A\u0430 \u0441\u0435\u0442\u043A\u0438 \u0441\u0442\u0430\u0442\u044C\u0438: \u0442\u0435\u043A\u0441\u0442, \u043C\u0430\u0440\u043A\u0435\u0440 \u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435';
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0431\u043B\u043E\u043A\u0430';
  };
  attributes: {
    bgColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    borderColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    bulletAlign: Schema.Attribute.Enumeration<['start', 'center', 'end']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'start'>;
    bulletBgColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    bulletDisabledBg: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    bulletDisabledPaddings: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    bulletIcon: Schema.Attribute.Media<'images'>;
    bulletPosition: Schema.Attribute.Enumeration<
      ['left', 'right', 'top', 'bottom']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'left'>;
    bulletScalePercent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 300;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    bulletText: Schema.Attribute.String;
    bulletTextColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    description: Schema.Attribute.RichText;
    descriptionColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    descriptionLinksColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    disabledBg: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    disabledPaddings: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    gridColumnsSpan: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    gridColumnsStart: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    gridRowsSpan: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    gridRowsStart: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    image: Schema.Attribute.Media<'images'>;
    imageAlign: Schema.Attribute.Enumeration<['start', 'center', 'end']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    imageAlt: Schema.Attribute.String;
    imageFit: Schema.Attribute.Enumeration<['contain', 'cover']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'contain'>;
    imagePosition: Schema.Attribute.Enumeration<
      ['top', 'bottom', 'left', 'right']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'bottom'>;
    imageScalePercent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 300;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    title: Schema.Attribute.String;
    titleColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    titleHtmlTag: Schema.Attribute.Enumeration<['h2', 'h3', 'h4', 'p']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'h3'>;
  };
}

export interface ArticleCardsGrid extends Struct.ComponentSchema {
  collectionName: 'components_article_cards_grids';
  info: {
    description: '\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0441\u043A\u0438\u0439 \u0431\u043B\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438 \u0441 \u043D\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u043C\u043E\u0439 \u0441\u0435\u0442\u043A\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A';
    displayName: '\u0421\u0435\u0442\u043A\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A';
  };
  attributes: {
    cards: Schema.Attribute.Component<'article.card', true>;
    description: Schema.Attribute.RichText;
    gridColumns: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3>;
    title: Schema.Attribute.String;
    titleColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
  };
}

export interface ArticleRelatedArticle extends Struct.ComponentSchema {
  collectionName: 'components_article_related_articles';
  info: {
    description: '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E \u0434\u043B\u044F \u0431\u043B\u043E\u043A\u0430 \u00AB\u0427\u0438\u0442\u0430\u0439\u0442\u0435 \u0442\u0430\u043A\u0436\u0435\u00BB.';
    displayName: '\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u0442\u0430\u0442\u044C\u044E';
  };
  attributes: {
    article: Schema.Attribute.Relation<'manyToOne', 'api::article.article'> &
      Schema.Attribute.Required;
  };
}

export interface ArticleRelatedProduct extends Struct.ComponentSchema {
  collectionName: 'components_article_related_products';
  info: {
    description: '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0432\u0430\u0440 \u0438\u043B\u0438 \u043D\u0430\u0431\u043E\u0440-\u0440\u0438\u0442\u0443\u0430\u043B \u0434\u043B\u044F \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0433\u043E \u0431\u043B\u043E\u043A\u0430.';
    displayName: '\u0422\u043E\u0432\u0430\u0440 / \u0440\u0438\u0442\u0443\u0430\u043B';
  };
  attributes: {
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
  };
}

export interface HomeArticlesPreview extends Struct.ComponentSchema {
  collectionName: 'components_home_articles_previews';
  info: {
    description: '\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A, \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0430\u043D\u043E\u043D\u0441 \u0438 \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0440\u0430\u0437\u0434\u0435\u043B \u0441\u0442\u0430\u0442\u0435\u0439.';
    displayName: '\u0410\u043D\u043E\u043D\u0441 \u0441\u0442\u0430\u0442\u0435\u0439';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    linkLabel: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface HomeCatalogPreview extends Struct.ComponentSchema {
  collectionName: 'components_home_catalog_previews';
  info: {
    description: '\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A, \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0430\u043D\u043E\u043D\u0441 \u0438 \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u043E\u0440\u0442\u043E\u0432.';
    displayName: '\u0410\u043D\u043E\u043D\u0441 \u0441\u043E\u0440\u0442\u043E\u0432';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    linkLabel: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface HomeEditorialSection extends Struct.ComponentSchema {
  collectionName: 'components_home_editorial_sections';
  info: {
    description: '\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0430\u0437\u0434\u0435\u043B \u00AB\u041E \u043F\u0440\u043E\u0435\u043A\u0442\u0435\u00BB \u0441 \u043D\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u043C\u044B\u043C\u0438 \u0446\u0432\u0435\u0442\u0430\u043C\u0438';
    displayName: '\u0420\u0435\u0434\u0430\u043A\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u0440\u0430\u0437\u0434\u0435\u043B';
  };
  attributes: {
    backgroundColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    eyebrow: Schema.Attribute.String;
    spacing: Schema.Attribute.Enumeration<['S', 'M', 'L', 'XL']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'L'>;
    textBlock1: Schema.Attribute.Text;
    textBlock2: Schema.Attribute.Text;
    textColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface HomeHero extends Struct.ComponentSchema {
  collectionName: 'components_home_heroes';
  info: {
    description: '\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u043C\u0430\u043A\u0435\u0442\u043E\u0432 50/50 \u0438 40/60; alt \u043C\u043E\u0436\u043D\u043E \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C \u0434\u043B\u044F \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F';
    displayName: '\u041F\u0435\u0440\u0432\u044B\u0439 \u044D\u043A\u0440\u0430\u043D';
  };
  attributes: {
    backgroundColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    cta: Schema.Attribute.Component<'shared.link', false>;
    eyebrow: Schema.Attribute.String;
    image: Schema.Attribute.Component<'shared.image-with-alt', false>;
    layout: Schema.Attribute.Enumeration<['50/50', '40/60', '100/0']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'50/50'>;
    text: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    textColor: Schema.Attribute.String &
      Schema.Attribute.CustomField<'plugin::color-picker.color'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface HomeRitualsPreview extends Struct.ComponentSchema {
  collectionName: 'components_home_rituals_previews';
  info: {
    description: '\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0430\u043D\u043E\u043D\u0441 \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u0440\u0438\u0442\u0443\u0430\u043B\u043E\u0432.';
    displayName: '\u0410\u043D\u043E\u043D\u0441 \u0440\u0438\u0442\u0443\u0430\u043B\u043E\u0432';
  };
  attributes: {
    eyebrow: Schema.Attribute.String;
    linkLabel: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface MaterialTemplatesBasicInfoCard extends Struct.ComponentSchema {
  collectionName: 'components_material_templates_basic_info_cards';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0441\u0435\u0442\u043A\u0438: \u0442\u0435\u043A\u0441\u0442, \u043C\u0430\u0440\u043A\u0435\u0440 \u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435';
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0441\u0435\u0442\u043A\u0438';
  };
  attributes: {
    bg_color: Schema.Attribute.String;
    border_color: Schema.Attribute.String;
    bullet_align: Schema.Attribute.Enumeration<['start', 'center', 'end']> &
      Schema.Attribute.DefaultTo<'start'>;
    bullet_bg_color: Schema.Attribute.String;
    bullet_disabled_bg: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    bullet_disabled_paddings: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    bullet_icon: Schema.Attribute.Media<'images'>;
    bullet_position: Schema.Attribute.Enumeration<
      ['left', 'right', 'top', 'bottom']
    > &
      Schema.Attribute.DefaultTo<'left'>;
    bullet_scale_percent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 300;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    bullet_text: Schema.Attribute.String;
    bullet_text_color: Schema.Attribute.String;
    description: Schema.Attribute.RichText;
    description_color: Schema.Attribute.String;
    description_links_color: Schema.Attribute.String;
    disabled_bg: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    disabled_paddings: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    grid_columns_span: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    grid_columns_start: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    grid_rows_span: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    grid_rows_start: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    image: Schema.Attribute.Media<'images'>;
    image_align: Schema.Attribute.Enumeration<['start', 'center', 'end']> &
      Schema.Attribute.DefaultTo<'center'>;
    image_alt: Schema.Attribute.String;
    image_fit: Schema.Attribute.Enumeration<['contain', 'cover']> &
      Schema.Attribute.DefaultTo<'contain'>;
    image_position: Schema.Attribute.Enumeration<
      ['top', 'bottom', 'left', 'right']
    > &
      Schema.Attribute.DefaultTo<'bottom'>;
    image_scale_percent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 300;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<100>;
    title: Schema.Attribute.String;
    title_color: Schema.Attribute.String;
    title_html_tag: Schema.Attribute.Enumeration<['h2', 'h3', 'h4', 'p']> &
      Schema.Attribute.DefaultTo<'h3'>;
  };
}

export interface MaterialTemplatesCardsGrid extends Struct.ComponentSchema {
  collectionName: 'components_material_templates_cards_grids';
  info: {
    description: '\u0421\u0435\u0442\u043A\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A BasicInfoCard';
    displayName: 'CardsGrid';
  };
  attributes: {
    cards: Schema.Attribute.Component<
      'material-templates.basic-info-card',
      true
    >;
    description: Schema.Attribute.RichText;
    grid_columns: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<2>;
    title: Schema.Attribute.RichText;
    title_color: Schema.Attribute.String;
  };
}

export interface ProductArticle extends Struct.ComponentSchema {
  collectionName: 'components_product_articles';
  info: {
    description: '\u0423\u043F\u043E\u0440\u044F\u0434\u043E\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0442\u0430\u0442\u044C\u044F \u0432 \u043D\u0438\u0436\u043D\u0435\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u043D\u043E\u0439 \u0437\u043E\u043D\u0435 \u0442\u043E\u0432\u0430\u0440\u0430';
    displayName: '\u0421\u0442\u0430\u0442\u044C\u044F';
  };
  attributes: {
    content: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<'plugin::better-blocks.better-blocks'>;
  };
}

export interface ProductGalleryImage extends Struct.ComponentSchema {
  collectionName: 'components_product_gallery_images';
  info: {
    description: '\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 alt \u0434\u043B\u044F \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C, \u0435\u0441\u043B\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0435. \u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0435\u0441 \u0444\u0430\u0439\u043B\u0430.';
    displayName: '\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0433\u0430\u043B\u0435\u0440\u0435\u0438';
  };
  attributes: {
    alt: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface ProductSpec extends Struct.ComponentSchema {
  collectionName: 'components_product_specs';
  info: {
    description: '\u041E\u0434\u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0430 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A: \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430 \u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435.';
    displayName: '\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0430';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

export interface SharedImageWithAlt extends Struct.ComponentSchema {
  collectionName: 'components_shared_images_with_alt';
  info: {
    description: '\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 alt \u0438\u043B\u0438 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C, \u0435\u0441\u043B\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u043E\u0435. \u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0435\u0441 \u0444\u0430\u0439\u043B\u0430.';
    displayName: '\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441 alt';
  };
  attributes: {
    alt: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface SharedLegalDocuments extends Struct.ComponentSchema {
  collectionName: 'components_shared_legal_documents';
  info: {
    description: 'PDF-\u0444\u0430\u0439\u043B\u044B, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043F\u043E \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u043C \u0430\u0434\u0440\u0435\u0441\u0430\u043C \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 /legal';
    displayName: '\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B';
  };
  attributes: {
    deliveryAndReturns: Schema.Attribute.Media<'files'>;
    privacyPolicy: Schema.Attribute.Media<'files'>;
    terms: Schema.Attribute.Media<'files'>;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: '\u0421\u0441\u044B\u043B\u043A\u0430';
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
  collectionName: 'components_shared_navigation_labels';
  info: {
    displayName: '\u041F\u043E\u0434\u043F\u0438\u0441\u0438 \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438';
  };
  attributes: {
    about: Schema.Attribute.String & Schema.Attribute.Required;
    cart: Schema.Attribute.String & Schema.Attribute.Required;
    nabory: Schema.Attribute.String & Schema.Attribute.Required;
    stati: Schema.Attribute.String & Schema.Attribute.Required;
    tovary: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSectionBreadcrumb extends Struct.ComponentSchema {
  collectionName: 'components_shared_section_breadcrumbs';
  info: {
    description: '\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u043C\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u0434\u043B\u044F \u0445\u043B\u0435\u0431\u043D\u044B\u0445 \u043A\u0440\u043E\u0448\u0435\u043A';
    displayName: '\u0425\u043B\u0435\u0431\u043D\u0430\u044F \u043A\u0440\u043E\u0448\u043A\u0430 \u0440\u0430\u0437\u0434\u0435\u043B\u0430';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    route: Schema.Attribute.Enumeration<['stantsii', 'paneli', 'stati']> &
      Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435. \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u0438\u043C\u0438; \u044D\u0442\u043E \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438, \u0430 \u043D\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.';
    displayName: 'SEO-\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStorefrontTexts extends Struct.ComponentSchema {
  collectionName: 'components_shared_storefront_texts';
  info: {
    description: '\u041E\u0431\u0449\u0438\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u0438 \u043D\u0430\u0431\u043E\u0440\u043E\u0432';
    displayName: '\u0422\u0435\u043A\u0441\u0442\u044B \u0432\u0438\u0442\u0440\u0438\u043D\u044B';
  };
  attributes: {
    imagePlaceholder: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    outOfStock: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'article.card': ArticleCard;
      'article.cards-grid': ArticleCardsGrid;
      'article.related-article': ArticleRelatedArticle;
      'article.related-product': ArticleRelatedProduct;
      'home.articles-preview': HomeArticlesPreview;
      'home.catalog-preview': HomeCatalogPreview;
      'home.editorial-section': HomeEditorialSection;
      'home.hero': HomeHero;
      'home.rituals-preview': HomeRitualsPreview;
      'material-templates.basic-info-card': MaterialTemplatesBasicInfoCard;
      'material-templates.cards-grid': MaterialTemplatesCardsGrid;
      'product.article': ProductArticle;
      'product.gallery-image': ProductGalleryImage;
      'product.spec': ProductSpec;
      'shared.image-with-alt': SharedImageWithAlt;
      'shared.legal-documents': SharedLegalDocuments;
      'shared.link': SharedLink;
      'shared.navigation-labels': SharedNavigationLabels;
      'shared.section-breadcrumb': SharedSectionBreadcrumb;
      'shared.seo': SharedSeo;
      'shared.storefront-texts': SharedStorefrontTexts;
    }
  }
}
