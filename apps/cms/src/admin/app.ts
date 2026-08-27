const ADMIN_LANGUAGE_STORAGE_KEY = "strapi-admin-language";

export const setRussianAdminLocale = (
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
) => {
  storage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, "ru");
};

const adminApp = {
  config: {
    locales: ["ru"],
    translations: {
      ru: {
        "search.placeholder": "Поиск",
        "content-manager.containers.edit.title.new": "Создать запись",
        "content-manager.components.Blocks.expand": "Развернуть",
        "content-manager.components.Blocks.dnd.instruction":
          "Чтобы переместить блок, нажмите Command или Control вместе с Shift и стрелкой вверх или вниз",
        "content-manager.form.Input.hint.character.unit":
          "{maxValue, plural, one { символ} few { символа} many { символов} other { символа}}",

        "content-manager.content-types.api::global-setting.global-setting.brandName":
          "Название бренда",
        "content-manager.content-types.api::global-setting.global-setting.currency":
          "Валюта",
        "content-manager.content-types.api::global-setting.global-setting.defaultProductStory":
          "Описание бутика",
        "content-manager.content-types.api::global-setting.global-setting.defaultSeo":
          "SEO по умолчанию",
        "content-manager.content-types.api::global-setting.global-setting.email":
          "Электронная почта",
        "content-manager.content-types.api::global-setting.global-setting.legalDetails":
          "Реквизиты",
        "content-manager.content-types.api::global-setting.global-setting.legalDocuments":
          "Юридические PDF-документы",
        "content-manager.content-types.api::global-setting.global-setting.logo":
          "Логотип",
        "content-manager.content-types.api::global-setting.global-setting.orderNotificationEmail":
          "Email для заказов",
        "content-manager.content-types.api::global-setting.global-setting.pickupAddress":
          "Адрес самовывоза",
        "content-manager.content-types.api::global-setting.global-setting.pickupDiscountPercent":
          "Скидка за самовывоз, %",
        "content-manager.content-types.api::global-setting.global-setting.maxItemQuantity":
          "Максимум одной позиции",
        "content-manager.content-types.api::global-setting.global-setting.courierDeliveryNote":
          "Условия курьерской доставки",
        "content-manager.content-types.api::global-setting.global-setting.navigation":
          "Подписи навигации",
        "content-manager.content-types.api::global-setting.global-setting.sectionBreadcrumbs":
          "Хлебные крошки разделов",
        "content-manager.content-types.api::global-setting.global-setting.storefrontTexts":
          "Тексты витрины",
        "content-manager.content-types.api::global-setting.global-setting.telegramUrl":
          "Ссылка на Telegram",

        "content-manager.content-types.api::home-page.home-page.about":
          "О проекте",
        "content-manager.content-types.api::home-page.home-page.hero":
          "Первый экран",
        "content-manager.content-types.api::home-page.home-page.tovaryPreview":
          "Анонс сортов",
        "content-manager.content-types.api::home-page.home-page.naboryPreview":
          "Анонс ритуалов",
        "content-manager.content-types.api::home-page.home-page.seo":
          "SEO-настройки",

        "content-manager.content-types.api::order.order.comment": "Комментарий",
        "content-manager.content-types.api::order.order.managerComment":
          "Комментарий менеджера",
        "content-manager.content-types.api::order.order.consents": "Согласия",
        "content-manager.content-types.api::order.order.currency": "Валюта",
        "content-manager.content-types.api::order.order.customerEmail":
          "Электронная почта покупателя",
        "content-manager.content-types.api::order.order.customerName":
          "Имя покупателя",
        "content-manager.content-types.api::order.order.customerPhone":
          "Телефон покупателя",
        "content-manager.content-types.api::order.order.deliveryAddress":
          "Адрес получения",
        "content-manager.content-types.api::order.order.deliveryMethod":
          "Способ получения",
        "content-manager.content-types.api::order.order.discountedTotalRubles":
          "Сумма со скидкой",
        "content-manager.content-types.api::order.order.idempotencyKey":
          "Ключ идемпотентности",
        "content-manager.content-types.api::order.order.lines": "Состав заказа",
        "content-manager.content-types.api::order.order.orderNumber":
          "Номер заказа",
        "content-manager.content-types.api::order.order.orderStatus":
          "Статус заказа",
        "content-manager.content-types.api::order.order.requestFingerprint":
          "Отпечаток запроса",
        "content-manager.content-types.api::order.order.statusHistory":
          "История статусов",
        "content-manager.content-types.api::order.order.totalRubles":
          "Стандартная сумма",
        "content-manager.content-types.api::order.order.pickupDiscountPercent":
          "Скидка за самовывоз, %",

        "content-manager.content-types.api::product.product.articles": "Статьи",
        "content-manager.content-types.api::product.product.cardExcerpt":
          "Краткий анонс",
        "content-manager.content-types.api::product.product.breadcrumbLabel":
          "Подпись в хлебных крошках",
        "content-manager.content-types.api::product.product.categoryLabel":
          "Категория для SEO",
        "content-manager.content-types.api::product.product.currency": "Валюта",
        "content-manager.content-types.api::product.product.gallery": "Галерея",
        "content-manager.content-types.api::product.product.mainImage":
          "Главное изображение",
        "content-manager.content-types.api::product.product.originalTitle":
          "Оригинальное название",
        "content-manager.content-types.api::product.product.packageLabel":
          "Тип упаковки и фасовка",
        "content-manager.content-types.api::product.product.price":
          "Цена в рублях",
        "content-manager.content-types.api::product.product.seedKey":
          "Системный ключ",
        "content-manager.content-types.api::product.product.seo":
          "SEO-настройки",
        "content-manager.content-types.api::product.product.slug":
          "URL-идентификатор",
        "content-manager.content-types.api::product.product.slugLocked":
          "Системная блокировка URL",
        "content-manager.content-types.api::product.product.stock":
          "Остаток на складе",
        "content-manager.content-types.api::product.product.story":
          "Описание товара",
        "content-manager.content-types.api::product.product.title": "Название",
        "content-manager.content-types.api::product.product.displayName":
          "Отображаемое название",
        "content-manager.content-types.api::product.product.type": "Тип",

        "content-manager.content-types.api::products-page.products-page.eyebrow":
          "Надстрочник",
        "content-manager.content-types.api::products-page.products-page.emptyStateText":
          "Текст пустого каталога",
        "content-manager.content-types.api::products-page.products-page.emptyStateLinkLabel":
          "Текст ссылки пустого каталога",
        "content-manager.content-types.api::products-page.products-page.intro":
          "Вступление",
        "content-manager.content-types.api::products-page.products-page.seo":
          "SEO-настройки",
        "content-manager.content-types.api::products-page.products-page.title":
          "Заголовок",

        "content-manager.content-types.api::rituals-page.rituals-page.eyebrow":
          "Надстрочник",
        "content-manager.content-types.api::rituals-page.rituals-page.emptyStateText":
          "Текст пустого каталога",
        "content-manager.content-types.api::rituals-page.rituals-page.emptyStateLinkLabel":
          "Текст ссылки пустого каталога",
        "content-manager.content-types.api::rituals-page.rituals-page.intro":
          "Вступление",
        "content-manager.content-types.api::rituals-page.rituals-page.seo":
          "SEO-настройки",
        "content-manager.content-types.api::rituals-page.rituals-page.title":
          "Заголовок",

        "content-manager.content-types.api::articles-page.articles-page.eyebrow":
          "Надстрочник",
        "content-manager.content-types.api::articles-page.articles-page.emptyStateText":
          "Текст пустого каталога",
        "content-manager.content-types.api::articles-page.articles-page.emptyStateLinkLabel":
          "Текст ссылки пустого каталога",
        "content-manager.content-types.api::articles-page.articles-page.intro":
          "Вступление",
        "content-manager.content-types.api::articles-page.articles-page.seo":
          "SEO-настройки",
        "content-manager.content-types.api::articles-page.articles-page.title":
          "Заголовок",

        "content-manager.content-types.api::article.article.blocks":
          "Блоки статьи",
        "content-manager.content-types.api::article.article.content":
          "Текст статьи",
        "content-manager.content-types.api::article.article.image":
          "Изображение",
        "content-manager.content-types.api::article.article.name": "Название",
        "content-manager.content-types.api::article.article.priority":
          "Приоритет",
        "content-manager.content-types.api::article.article.seedKey":
          "Системный ключ",
        "content-manager.content-types.api::article.article.seo":
          "SEO-настройки",
        "content-manager.content-types.api::article.article.slug":
          "URL-идентификатор",
        "content-manager.content-types.api::article.article.slugLocked":
          "Системная блокировка URL",

        "content-manager.components.article.card.title": "Заголовок",
        "content-manager.components.article.card.titleHtmlTag":
          "HTML-тег заголовка",
        "content-manager.components.article.card.description": "Описание",
        "content-manager.components.article.card.titleColor": "Цвет заголовка",
        "content-manager.components.article.card.descriptionColor":
          "Цвет описания",
        "content-manager.components.article.card.descriptionLinksColor":
          "Цвет ссылок описания",
        "content-manager.components.article.card.bgColor": "Цвет фона",
        "content-manager.components.article.card.borderColor": "Цвет рамки",
        "content-manager.components.article.card.bulletIcon": "Иконка маркера",
        "content-manager.components.article.card.bulletText": "Текст маркера",
        "content-manager.components.article.card.bulletTextColor":
          "Цвет текста маркера",
        "content-manager.components.article.card.bulletBgColor":
          "Цвет фона маркера",
        "content-manager.components.article.card.bulletPosition":
          "Положение маркера",
        "content-manager.components.article.card.bulletAlign":
          "Выравнивание маркера",
        "content-manager.components.article.card.bulletScalePercent":
          "Масштаб маркера, %",
        "content-manager.components.article.card.bulletDisabledBg":
          "Без фона маркера",
        "content-manager.components.article.card.bulletDisabledPaddings":
          "Без отступов маркера",
        "content-manager.components.article.card.image": "Изображение",
        "content-manager.components.article.card.imageAlt":
          "Альтернативный текст",
        "content-manager.components.article.card.imagePosition":
          "Положение изображения",
        "content-manager.components.article.card.imageFit":
          "Вписывание изображения",
        "content-manager.components.article.card.imageAlign":
          "Выравнивание изображения",
        "content-manager.components.article.card.imageScalePercent":
          "Масштаб изображения, %",
        "content-manager.components.article.card.disabledBg": "Без фона",
        "content-manager.components.article.card.disabledPaddings":
          "Без внутренних отступов",
        "content-manager.components.article.card.gridRowsStart":
          "Начало по строке",
        "content-manager.components.article.card.gridRowsSpan":
          "Высота в строках",
        "content-manager.components.article.card.gridColumnsStart":
          "Начало по колонке",
        "content-manager.components.article.card.gridColumnsSpan":
          "Ширина в колонках",
        "content-manager.components.article.cards-grid.title": "Заголовок блока",
        "content-manager.components.article.cards-grid.description":
          "Описание блока",
        "content-manager.components.article.cards-grid.titleColor":
          "Цвет заголовка",
        "content-manager.components.article.cards-grid.gridColumns":
          "Число колонок",
        "content-manager.components.article.cards-grid.cards": "Карточки",

        "content-manager.components.material-templates.cards-grid.title":
          "Заголовок блока",
        "content-manager.components.material-templates.cards-grid.description":
          "Описание блока",
        "content-manager.components.material-templates.cards-grid.title_color":
          "Цвет заголовка",
        "content-manager.components.material-templates.cards-grid.grid_columns":
          "Число колонок",
        "content-manager.components.material-templates.cards-grid.cards":
          "Карточки",
        "content-manager.components.material-templates.basic-info-card.title":
          "Заголовок",
        "content-manager.components.material-templates.basic-info-card.description":
          "Описание",
        "content-manager.components.material-templates.basic-info-card.title_color":
          "Цвет заголовка",
        "content-manager.components.material-templates.basic-info-card.description_color":
          "Цвет описания",
        "content-manager.components.material-templates.basic-info-card.description_links_color":
          "Цвет ссылок описания",
        "content-manager.components.material-templates.basic-info-card.bg_color":
          "Цвет фона",
        "content-manager.components.material-templates.basic-info-card.border_color":
          "Цвет рамки",
        "content-manager.components.material-templates.basic-info-card.bullet_text":
          "Текст маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_icon":
          "Иконка маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_text_color":
          "Цвет текста маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_bg_color":
          "Цвет фона маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_position":
          "Положение маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_align":
          "Выравнивание маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_scale_percent":
          "Масштаб маркера, %",
        "content-manager.components.material-templates.basic-info-card.bullet_disabled_bg":
          "Без фона маркера",
        "content-manager.components.material-templates.basic-info-card.bullet_disabled_paddings":
          "Без отступов маркера",
        "content-manager.components.material-templates.basic-info-card.image":
          "Изображение",
        "content-manager.components.material-templates.basic-info-card.image_alt":
          "Альтернативный текст",
        "content-manager.components.material-templates.basic-info-card.image_position":
          "Положение изображения",
        "content-manager.components.material-templates.basic-info-card.image_fit":
          "Вписывание изображения",
        "content-manager.components.material-templates.basic-info-card.image_align":
          "Выравнивание изображения",
        "content-manager.components.material-templates.basic-info-card.image_scale_percent":
          "Масштаб изображения, %",
        "content-manager.components.material-templates.basic-info-card.title_html_tag":
          "HTML-тег заголовка",
        "content-manager.components.material-templates.basic-info-card.disabled_bg":
          "Без фона",
        "content-manager.components.material-templates.basic-info-card.disabled_paddings":
          "Без внутренних отступов",
        "content-manager.components.material-templates.basic-info-card.grid_rows_start":
          "Начало по строке",
        "content-manager.components.material-templates.basic-info-card.grid_rows_span":
          "Высота в строках",
        "content-manager.components.material-templates.basic-info-card.grid_columns_start":
          "Начало по колонке",
        "content-manager.components.material-templates.basic-info-card.grid_columns_span":
          "Ширина в колонках",

        "content-manager.content-types.api::robots-txt.robots-txt.content":
          "Содержимое robots.txt",

        "content-manager.content-types.api::home-page.home-page.featuredNabory":
          "Ритуалы на главной",
        "content-manager.content-types.api::home-page.home-page.featuredTovary":
          "Сорта на главной",

        "content-manager.components.home.catalog-preview.eyebrow":
          "Надстрочник",
        "content-manager.components.home.catalog-preview.linkLabel":
          "Текст ссылки на каталог",
        "content-manager.components.home.catalog-preview.subtitle":
          "Краткий анонс",
        "content-manager.components.home.catalog-preview.title": "Заголовок",
        "content-manager.components.home.rituals-preview.linkLabel":
          "Текст ссылки на каталог",
        "content-manager.components.home.editorial-section.backgroundColor":
          "Цвет фона",
        "content-manager.components.home.editorial-section.eyebrow":
          "Надстрочник",
        "content-manager.components.home.editorial-section.spacing":
          "Вертикальный отступ",
        "content-manager.components.home.editorial-section.title": "Заголовок",
        "content-manager.components.home.editorial-section.textBlock1":
          "Текстовый блок 1",
        "content-manager.components.home.editorial-section.textBlock2":
          "Текстовый блок 2",
        "content-manager.components.home.editorial-section.textColor":
          "Цвет текста",
        "content-manager.components.home.hero.backgroundColor": "Цвет фона",
        "content-manager.components.home.hero.eyebrow": "Надстрочник",
        "content-manager.components.home.hero.cta": "Ссылка действия",
        "content-manager.components.home.hero.image": "Изображение",
        "content-manager.components.home.hero.layout": "Макет",
        "content-manager.components.home.hero.text": "Текст",
        "content-manager.components.home.hero.textColor": "Цвет текста",
        "content-manager.components.home.hero.title": "Заголовок",
        "content-manager.components.home.rituals-preview.eyebrow":
          "Надстрочник",
        "content-manager.components.home.rituals-preview.subtitle":
          "Краткий анонс",
        "content-manager.components.home.rituals-preview.title": "Заголовок",
        "content-manager.components.product.article.content": "Содержимое",
        "content-manager.components.product.gallery-image.alt":
          "Альтернативный текст",
        "content-manager.components.product.gallery-image.image": "Изображение",
        "content-manager.components.shared.image-with-alt.alt":
          "Альтернативный текст",
        "content-manager.components.shared.image-with-alt.image": "Изображение",
        "content-manager.components.shared.link.label": "Текст ссылки",
        "content-manager.components.shared.link.url": "Адрес ссылки",
        "content-manager.components.shared.legal-documents.privacyPolicy":
          "Политика конфиденциальности",
        "content-manager.components.shared.legal-documents.terms":
          "Пользовательское соглашение",
        "content-manager.components.shared.legal-documents.deliveryAndReturns":
          "Условия доставки и возврата",
        "content-manager.components.shared.navigation-labels.about":
          "О проекте",
        "content-manager.components.shared.navigation-labels.cart": "Корзина",
        "content-manager.components.shared.navigation-labels.tovary": "Сорта",
        "content-manager.components.shared.navigation-labels.nabory": "Ритуалы",
        "content-manager.components.shared.navigation-labels.stati": "Статьи",
        "content-manager.components.shared.section-breadcrumb.route": "Раздел",
        "content-manager.components.shared.section-breadcrumb.label": "Подпись",
        "content-manager.components.shared.seo.description": "Meta-описание",
        "content-manager.components.shared.seo.image":
          "Изображение для публикации",
        "content-manager.components.shared.seo.title": "Meta-заголовок",
        "content-manager.components.shared.storefront-texts.imagePlaceholder":
          "Текст вместо изображения",
        "content-manager.components.shared.storefront-texts.outOfStock":
          "Нет в наличии",
      },
    },
  },
  bootstrap() {
    setRussianAdminLocale();
  },
} as const;

export const russianAdminTranslations = adminApp.config.translations.ru;

export default adminApp;
