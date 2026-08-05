import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  alignBetterBlocksImages,
  assertSeedAllowed,
  planSeed,
  PUBLIC_STOREFRONT_ACTIONS,
  resolveSeedArticleImages,
} from "./seed-helpers.ts";
import { SHENG_PUER_PRODUCT } from "./seed-product-fixtures.ts";

const require = createRequire(import.meta.url);
const { compileStrapi, createStrapi } =
  require("@strapi/strapi") as typeof import("@strapi/strapi");

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));
const assetsDirectory = resolve(currentDirectory, "seed-assets");
const paragraph = (text: string) => [
  {
    type: "paragraph",
    children: [{ type: "text", text }],
  },
];
const sharedGalleryAssets = [
  {
    asset: "gallery-gaiwan.png",
    alt: "Открытая светлая гайвань с заваренным чайным листом",
  },
  {
    asset: "gallery-pour.png",
    alt: "Янтарный чай наливают из чахая в светлую пиалу",
  },
  {
    asset: "gallery-cup.png",
    alt: "Светлая пиала с готовым чаем и влажный чайный лист",
  },
] as const;
const articleImageMetadata = [
  {
    asset: "gallery-gaiwan.png",
    alternativeText: "Светлая гайвань с раскрытым чайным листом",
    caption: "Посуда после нескольких коротких проливов",
  },
  {
    asset: "gallery-pour.png",
    alternativeText: "Янтарный настой переливают в светлую пиалу",
    caption: "Цвет настоя на третьем проливе",
  },
] as const;

const products = [
  {
    key: "ritual-evening",
    title: "Утро без слов",
    type: "nabor",
    originalTitle: null,
    packageLabel: "Подарочный набор",
    price: 4200,
    currency: "RUB",
    stock: 7,
    cardExcerpt: "Светлый чай, тонкая керамика и десять минут тишины.",
    story: "Посуда и чай собраны в единый неторопливый сценарий.",
    articles: [
      {
        content: [
          {
            type: "heading",
            level: 1,
            children: [{ type: "text", text: "Как устроено утро" }],
          },
          ...paragraph(
            "Набор рассчитан на короткое чаепитие до начала дня: спокойный светлый чай, небольшая гайвань и одна чашка.",
          ),
          {
            type: "heading",
            level: 2,
            children: [{ type: "text", text: "Последовательность" }],
          },
          {
            type: "list",
            format: "ordered",
            children: [
              {
                type: "list-item",
                children: [{ type: "text", text: "Прогрейте посуду водой." }],
              },
              {
                type: "list-item",
                children: [
                  { type: "text", text: "Сделайте короткий первый пролив." },
                ],
              },
              {
                type: "list-item",
                children: [
                  {
                    type: "text",
                    text: "Оставьте несколько минут без телефона.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    imageAsset: "ritual-morning-without-words.png",
    imageAlt: "Белая гайвань, чашка и зелёный чай на светлом столе",
  },
  {
    key: "ritual-after-rain",
    title: "После дождя",
    type: "nabor",
    packageLabel: "Подарочный набор",
    price: 4400,
    currency: "RUB",
    stock: 5,
    cardExcerpt: "Глубокий аромат прогретого листа и влажного дерева.",
    story: "Набор для спокойного чаепития после долгой прогулки.",
    articles: [
      {
        content: [
          {
            type: "heading",
            level: 1,
            children: [{ type: "text", text: "Ритуал после прогулки" }],
          },
          ...paragraph(
            "Тёмная керамика удерживает тепло, а плотный чай постепенно раскрывает древесные и пряные оттенки.",
          ),
          {
            type: "heading",
            level: 2,
            children: [{ type: "text", text: "Для долгого вечера" }],
          },
          ...paragraph(
            "Начните с коротких проливов и понемногу увеличивайте время. Набор лучше всего работает без спешки, когда чай успевает меняться от чашки к чашке.",
          ),
          {
            type: "quote",
            children: [
              {
                type: "text",
                text: "Сначала согрейте посуду, затем дайте листу несколько секунд раскрыться.",
              },
            ],
          },
        ],
      },
    ],
    imageAsset: "ritual-after-rain.png",
    imageAlt: "Тёмный чайник и две чашки на мокром деревянном подносе",
  },
  {
    key: "ritual-long-evening",
    title: "Долгий вечер",
    type: "nabor",
    packageLabel: "Подарочный набор",
    price: 4600,
    currency: "RUB",
    stock: 4,
    cardExcerpt: "Набор для медленного разговора и второго пролива.",
    story: "Чай и посуда для вечера, у которого нет расписания.",
    imageAsset: "ritual-long-evening.png",
    imageAlt: "Тёмный чайник и две чашки в тёплом вечернем свете",
  },
  {
    key: "ritual-warm-light",
    title: "Тёплый свет",
    type: "nabor",
    packageLabel: "Подарочный набор",
    price: 4100,
    currency: "RUB",
    stock: 6,
    cardExcerpt: "Мягкий красный чай и маленькая чашка ручной работы.",
    story: "Компактный набор для тихого вечера дома.",
    imageAsset: "ritual-warm-light.png",
    imageAlt: "Красный глиняный чайник и чашка в тёплом свете",
  },
  {
    key: "product-da-hong-pao",
    title: "Да Хун Пао",
    type: "tovar",
    originalTitle: "Большой красный халат",
    packageLabel: "Пакетик (50 г)",
    price: 1600,
    currency: "RUB",
    stock: 12,
    cardExcerpt: "Минеральный утёсный улун с тёплым древесным ароматом.",
    story: "Выразительный чай для нескольких коротких проливов.",
    articles: [
      {
        content: [
          {
            type: "heading",
            level: 1,
            children: [{ type: "text", text: "Как раскрывается чай" }],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Первые проливы дают ",
              },
              {
                type: "text",
                text: "тёплый древесный аромат",
                bold: true,
              },
              {
                type: "text",
                text: ", затем проявляются минеральность и ",
              },
              {
                type: "text",
                text: "мягкая фруктовая сладость",
                italic: true,
              },
            ],
          },
          {
            type: "heading",
            level: 3,
            children: [{ type: "text", text: "Аромат и тело" }],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "В сухом листе заметны какао и тёплое дерево. В настое — печёные фрукты, камень после дождя и долгое сладкое послевкусие.",
              },
            ],
          },
          {
            type: "seed-image",
            asset: "gallery-gaiwan.png",
          },
          {
            type: "paragraph",
            children: [
              { type: "text", text: "Сравните его с " },
              {
                type: "link",
                url: "/tovary",
                children: [{ type: "text", text: "другими сортами" }],
              },
              {
                type: "text",
                text: " из короткой коллекции Brega Tea.",
              },
            ],
          },
        ],
      },
      {
        content: [
          {
            type: "heading",
            level: 2,
            children: [{ type: "text", text: "Как заваривать" }],
          },
          {
            type: "list",
            format: "unordered",
            children: [
              {
                type: "list-item",
                children: [{ type: "text", text: "Вода около 95 °C" }],
              },
              {
                type: "list-item",
                children: [{ type: "text", text: "Короткие проливы" }],
              },
            ],
          },
          {
            type: "quote",
            children: [
              {
                type: "text",
                text: "Не торопитесь увеличивать время: чай раскрывается постепенно.",
              },
            ],
          },
          {
            type: "heading",
            level: 3,
            children: [{ type: "text", text: "Параметры пролива" }],
          },
          {
            type: "list",
            format: "ordered",
            children: [
              {
                type: "list-item",
                children: [{ type: "text", text: "Прогрейте посуду." }],
              },
              {
                type: "list-item",
                children: [
                  {
                    type: "text",
                    text: "Возьмите 6–7 граммов листа на 100 мл воды.",
                  },
                ],
              },
              {
                type: "list-item",
                children: [
                  {
                    type: "text",
                    text: "Начните с проливов по 5–10 секунд.",
                  },
                ],
              },
            ],
          },
          {
            type: "seed-image",
            asset: "gallery-pour.png",
          },
          {
            type: "heading",
            level: 4,
            children: [{ type: "text", text: "Хранение" }],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Храните чай плотно закрытым, вдали от света, влаги и сильных запахов.",
                underline: true,
              },
            ],
          },
        ],
      },
    ],
    imageAsset: "tea-da-hong-pao.png",
    imageAlt: "Сухие листья Да Хун Пао и бежевая чайная банка",
  },
  {
    key: "product-sold-out",
    title: "Гёкуро Асахи",
    type: "tovar",
    packageLabel: "Пакетик (40 г)",
    price: 2400,
    currency: "RUB",
    stock: 0,
    cardExcerpt: "Глубокий японский зелёный чай с насыщенным вкусом умами.",
    story: "Низкая температура воды раскрывает сладость и морскую свежесть.",
    imageAsset: "tea-gyokuro-asahi.png",
    imageAlt: "Тёмно-зелёные листья гёкуро и зелёная чайная банка",
  },
  SHENG_PUER_PRODUCT,
  {
    key: "product-lun-jing",
    title: "Лунцзин",
    type: "tovar",
    originalTitle: "Колодец дракона",
    packageLabel: "Пакетик (50 г)",
    price: 1800,
    currency: "RUB",
    stock: 8,
    cardExcerpt: "Ореховый, ясный, весенний.",
    story: "Свежий зелёный чай с мягкой сладостью и ореховым ароматом.",
    imageAsset: "tea-longjing.png",
    imageAlt: "Плоские листья лунцзина и светлая чайная банка",
  },
  {
    key: "product-sencha",
    title: "Сенча",
    type: "tovar",
    originalTitle: "Пропаренный чай",
    packageLabel: "Пакетик (50 г)",
    price: 1700,
    currency: "RUB",
    stock: 10,
    cardExcerpt: "Свежая зелень и морской воздух.",
    story: "Японский зелёный чай для чистой и бодрой повседневной чашки.",
    imageAsset: "tea-sencha.png",
    imageAlt: "Игольчатые листья сенчи и серая чайная банка",
  },
  {
    key: "product-bai-mu-dan",
    title: "Бай Му Дань",
    type: "tovar",
    originalTitle: "Белый пион",
    packageLabel: "Пакетик (50 г)",
    price: 1900,
    currency: "RUB",
    stock: 7,
    cardExcerpt: "Белый чай с ароматом сухих трав, груши и полевых цветов.",
    story: "Мягкий чай для длинного спокойного заваривания.",
    imageAsset: "tea-bai-mu-dan.png",
    imageAlt: "Светлые крупные листья белого чая и чайная банка",
  },
  {
    key: "product-dian-hong",
    title: "Дянь Хун",
    type: "tovar",
    originalTitle: "Юньнаньский красный чай",
    packageLabel: "Пакетик (50 г)",
    price: 1500,
    currency: "RUB",
    stock: 9,
    cardExcerpt: "Красный чай с оттенками мёда, какао и печёного яблока.",
    story: "Плотный и ясный чай для неспешного утра.",
    imageAsset: "tea-dian-hong.png",
    imageAlt: "Золотисто-коричневые скрученные листья красного чая",
  },
] as const;

async function uploadSeedAsset(
  strapi: Awaited<ReturnType<typeof createStrapi>>,
  name: string,
) {
  const existing = await strapi.db.query("plugin::upload.file").findOne({
    where: { name },
  });

  if (existing) {
    return existing;
  }

  const path = resolve(assetsDirectory, name);
  const fileStats = await stat(path);
  const [uploaded] = await strapi
    .plugin("upload")
    .service("upload")
    .upload({
      data: {
        fileInfo: {
          name,
          alternativeText: `Seed image: ${basename(name, ".png")}`,
        },
      },
      files: {
        filepath: path,
        originalFilename: name,
        mimetype: "image/png",
        size: fileStats.size,
      },
    });

  return uploaded;
}

async function upsertSingle(
  strapi: Awaited<ReturnType<typeof createStrapi>>,
  uid:
    | "api::global-setting.global-setting"
    | "api::home-page.home-page"
    | "api::products-page.products-page",
  data: Record<string, unknown>,
) {
  const existing = await strapi.documents(uid).findFirst();

  if (existing) {
    await strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      status: "published",
    });
    return;
  }

  await strapi.documents(uid).create({ data, status: "published" });
}

async function grantPublicStorefrontRead(
  strapi: Awaited<ReturnType<typeof createStrapi>>,
) {
  const role = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "public" },
    populate: ["permissions"],
  });

  if (!role) {
    throw new Error("Public role was not found");
  }

  const existingActions = new Set(
    role.permissions.map((permission: { action: string }) => permission.action),
  );
  const permissions = strapi.db.query("plugin::users-permissions.permission");

  for (const action of PUBLIC_STOREFRONT_ACTIONS) {
    if (!existingActions.has(action)) {
      await permissions.create({ data: { action, role: role.id } });
    }
  }
}

async function run() {
  assertSeedAllowed(process.env);

  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();

  try {
    const imageByAsset = new Map<string, { id: number }>();
    for (const asset of [
      "hero-tea-ritual.png",
      ...sharedGalleryAssets.map((image) => image.asset),
      ...products.flatMap((product) =>
        "imageAsset" in product ? [product.imageAsset] : [],
      ),
    ]) {
      imageByAsset.set(asset, await uploadSeedAsset(strapi, asset));
    }

    const uploadFiles = strapi.db.query("plugin::upload.file");
    for (const metadata of articleImageMetadata) {
      const image = imageByAsset.get(metadata.asset);
      if (image) {
        const updated = await uploadFiles.update({
          where: { id: image.id },
          data: {
            alternativeText: metadata.alternativeText,
            caption: metadata.caption,
          },
        });
        imageByAsset.set(metadata.asset, updated);
      }
    }

    const defaultSeo = {
      title: "Brega Tea — чай и ритуалы",
      description: "Отборный чай, посуда и готовые ритуалы для дома.",
    };
    const mainImage = (asset: string, alt: string) => ({
      image: imageByAsset.get(asset)?.id,
      alt,
    });

    await upsertSingle(strapi, "api::global-setting.global-setting", {
      brandName: "Brega Tea",
      logo: null,
      email: "hello@example.test",
      orderNotificationEmail: "orders@example.test",
      pickupAddress: "г. Москва, ул. Чайная, д. 1. Ежедневно с 10:00 до 22:00.",
      pickupDiscountPercent: 10,
      courierDeliveryNote:
        "Стоимость рассчитывается в день отправки, до 1000 руб.",
      telegramUrl: "https://t.me/brega_chai",
      defaultProductStory: paragraph(
        "Каждый чай отобран для ясного и спокойного домашнего ритуала.",
      ),
      navigation: {
        about: "О проекте",
        nabory: "Ритуалы",
        tovary: "Сорта",
        cart: "Корзина",
      },
      sectionBreadcrumbs: [
        { route: "tovary", label: "Сорта" },
        { route: "nabory", label: "Ритуалы" },
      ],
      storefrontTexts: {
        imagePlaceholder: "Изображение готовится",
        outOfStock: "Нет в наличии",
      },
      currency: "RUB",
      defaultSeo,
      legalDetails: "ИП Иванов Иван. ИНН 123456789",
    });

    const homePageData = {
      seo: defaultSeo,
      hero: {
        eyebrow: "Чай как личная практика",
        title: "У времени есть вкус.",
        text: "Небольшая коллекция чая и предметов для тех моментов, когда спешить больше некуда.",
        layout: "40/60",
        image: mainImage(
          "hero-tea-ritual.png",
          "Чаша зелёного чая и светлая чайная банка на каменном столе",
        ),
        backgroundColor: null,
        textColor: null,
        cta: { label: "К ритуалам", url: "#nabory" },
      },
      about: {
        eyebrow: "Глава 01 · О проекте",
        title: "Вещи обретают смысл, когда становятся частью привычки.",
        textBlock1:
          "Мы собираем чай, посуду и простые инструкции в цельные сценарии — для утра, разговора, одиночества или подарка.",
        textBlock2:
          "Ассортимент короткий намеренно. Здесь не нужно сравнивать десятки почти одинаковых позиций.",
        spacing: "L",
      },
      naboryPreview: {
        eyebrow: "Глава 02",
        title: "Ритуалы",
        subtitle: "Всё необходимое для готового чайного сценария.",
      },
      tovaryPreview: {
        eyebrow: "Глава 03",
        title: "Сорта",
        subtitle: "Чай для самостоятельного знакомства.",
        linkLabel: "Все сорта",
      },
    };

    await upsertSingle(strapi, "api::products-page.products-page", {
      eyebrow: "Глава 03",
      seo: {
        title: "Сорта чая — Brega Tea",
        description: "Все сорта чая Brega Tea.",
      },
      title: "Сорта",
      emptyStateText: "Сорта скоро появятся.",
      emptyStateLinkLabel: "Вернуться на главную",
      intro:
        "Исследуйте чай через происхождение, аромат и собственный ритм заваривания.",
    });

    const productDocuments = strapi.documents("api::product.product");
    const existingProducts = await productDocuments.findMany();
    const existingBySeedKey = existingProducts.flatMap((product) => {
      const desired = products.find(
        (candidate) => candidate.key === product.seedKey,
      );
      return desired
        ? [
            {
              key: desired.key,
              documentId: product.documentId,
              slug: product.slug,
            },
          ]
        : [];
    });

    for (const operation of planSeed(products, existingBySeedKey)) {
      const productData: Record<string, unknown> = {
        ...operation.record,
        title: `${operation.record.type === "nabor" ? "Ритуал" : "Сорт"}: ${operation.record.title}`,
        displayName: operation.record.title,
        seedKey: operation.record.key,
        categoryLabel:
          operation.record.type === "nabor" ? "чайный ритуал" : "сорт чая",
        seo: {
          title: `${operation.record.title} — ${
            operation.record.type === "nabor" ? "чайный ритуал" : "сорт чая"
          } Brega Tea`,
          description: operation.record.cardExcerpt,
        },
      };
      delete productData.key;
      delete productData.imageAsset;
      delete productData.imageAlt;

      if (operation.type === "update" && operation.slug) {
        productData.slug = operation.slug;
      }

      if ("articles" in operation.record && operation.record.articles) {
        productData.articles = operation.record.articles.map(
          (article, index) => {
            const content = resolveSeedArticleImages(
              article.content,
              imageByAsset,
            );

            return {
              content: alignBetterBlocksImages(
                content,
                index % 2 === 0 ? "left" : "right",
              ),
            };
          },
        );
      }

      const imageAsset =
        "imageAsset" in operation.record
          ? operation.record.imageAsset
          : undefined;
      Object.assign(productData, {
        gallery: sharedGalleryAssets.map(({ asset, alt }) =>
          mainImage(asset, alt),
        ),
        ...(imageAsset
          ? {
              mainImage: mainImage(
                imageAsset,
                "imageAlt" in operation.record
                  ? operation.record.imageAlt
                  : operation.record.title,
              ),
            }
          : {}),
      });

      if (operation.type === "update" && operation.documentId) {
        await productDocuments.update({
          documentId: operation.documentId,
          data: productData,
          status: "published",
        });
      } else {
        await productDocuments.create({
          data: productData,
          status: "published",
        });
      }
    }

    const publishedProducts = await productDocuments.findMany({
      status: "published",
    });
    const productIdBySeedKey = new Map(
      publishedProducts.map((product) => [
        String(product.seedKey),
        product.documentId,
      ]),
    );
    const relationIds = (type: "nabor" | "tovar") =>
      products
        .filter((product) => product.type === type)
        .flatMap((product) => {
          const documentId = productIdBySeedKey.get(product.key);
          return documentId ? [documentId] : [];
        });

    await upsertSingle(strapi, "api::home-page.home-page", {
      ...homePageData,
      featuredNabory: { set: relationIds("nabor") },
      featuredTovary: { set: relationIds("tovar").slice(0, 4) },
    });

    await grantPublicStorefrontRead(strapi);
  } finally {
    await strapi.destroy();
  }
}

await run();
