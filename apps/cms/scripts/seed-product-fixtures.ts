export const SHENG_PUER_PRODUCT = {
  // Preserve the legacy seed key so repeated seeds update the existing document.
  key: "product-without-image",
  title:
    "Шэн пуэр выдержанный — длинное тестовое название карточки для проверки предельной длины заголовка каталога и переноса текста в интерфейсе",
  type: "tovar",
  packageLabel: "Блин (100 г)",
  price: 3100,
  currency: "RUB",
  stock: 3,
  cardExcerpt:
    "Этот намеренно длинный кураторский анонс проверяет предельную длину текста карточки, перенос строк и устойчивость каталожной сетки на разных ширинах экрана.",
  story:
    "Выдержанный шэн пуэр с чистым настоем и спокойным, постепенно раскрывающимся вкусом.",
  imageAsset: "gallery-gaiwan.png",
  imageAlt: "Открытая светлая гайвань с заваренным чайным листом",
} as const;
