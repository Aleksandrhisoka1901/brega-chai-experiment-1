import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertSeedAllowed,
  planSeed,
  PUBLIC_STOREFRONT_ACTIONS,
} from "./seed-helpers.ts";
import {
  FEATURED_PANEL_KEYS,
  FEATURED_STATION_KEYS,
  SEED_CATALOG_PRODUCTS,
} from "./seed-catalog.mts";

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

const products = SEED_CATALOG_PRODUCTS;
const heroAsset = "ctechi-st2000.png";
const articleImageMetadata = [
  {
    asset: "ctechi-gt500.png",
    alternativeText: "Портативная электростанция CTECHi GT500 в интерьере",
    caption: "Средний формат для квартиры и дачи",
  },
  {
    asset: "ctechi-gt1200.png",
    alternativeText: "Портативная электростанция CTECHi GT1200",
    caption: "Резерв для дома, которому нельзя останавливаться",
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
    | "api::products-page.products-page"
    | "api::rituals-page.rituals-page"
    | "api::articles-page.articles-page"
    | "api::robots-txt.robots-txt",
  data: Record<string, unknown>,
) {
  const existing = await strapi.documents(uid).findFirst();

  if (existing) {
    await strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      ...(uid === "api::robots-txt.robots-txt" ? {} : { status: "published" }),
    });
    return;
  }

  await strapi.documents(uid).create({
    data,
    ...(uid === "api::robots-txt.robots-txt" ? {} : { status: "published" }),
  });
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
  strapi.cron.stop();

  try {
    const imageByAsset = new Map<string, { id: number }>();
    for (const asset of [
      heroAsset,
      ...products.map((product) => product.imageAsset),
    ]) {
      if (!imageByAsset.has(asset)) {
        imageByAsset.set(asset, await uploadSeedAsset(strapi, asset));
      }
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
      title: "Voltora — портативные электростанции и солнечные панели",
      description:
        "Портативные электростанции и складные солнечные панели для дома, дачи и резервного питания. Доставка по России, опт и розница.",
    };
    const mainImage = (asset: string, alt: string) => ({
      image: imageByAsset.get(asset)?.id,
      alt,
    });

    await upsertSingle(strapi, "api::global-setting.global-setting", {
      brandName: "Voltora",
      logo: null,
      email: "hello@voltora.ru",
      orderNotificationEmail: "orders@voltora.ru",
      pickupAddress:
        "Самовывоз осуществляется по адресу: г. Москва, проезд Серебрякова, д. 14, стр. 6.",
      pickupDiscountPercent: null,
      maxItemQuantity: 5,
      courierDeliveryNote:
        "Стоимость доставки рассчитывается в день отправки.",
      telegramUrl: "https://t.me/voltora",
      defaultProductStory: paragraph(
        "Перед подключением сверяйте номинальную и пусковую мощность прибора с характеристиками станции. Фактическое время работы зависит от нагрузки и режима эксплуатации.",
      ),
      navigation: {
        about: "О компании",
        nabory: "Солнечные панели",
        tovary: "Электростанции",
        stati: "Статьи",
        cart: "Корзина",
      },
      sectionBreadcrumbs: [
        { route: "stantsii", label: "Электростанции" },
        { route: "paneli", label: "Солнечные панели" },
        { route: "stati", label: "Статьи" },
      ],
      storefrontTexts: {
        imagePlaceholder: "Изображение готовится",
        outOfStock: "Нет в наличии",
      },
      currency: "RUB",
      defaultSeo,
      legalDetails: "Voltora. Доставка по всей России.",
    });

    const homePageData = {
      seo: defaultSeo,
      hero: {
        eyebrow: "Энергия рядом. Всегда.",
        title: "Свет есть — когда он нужен.",
        text: "Портативные электростанции и солнечные панели для дома, дачи и тех часов, когда обычная сеть недоступна.",
        layout: "40/60",
        image: mainImage(
          heroAsset,
          "Портативная электростанция CTECHi ST2000",
        ),
        backgroundColor: "#1E2329",
        textColor: "#F5F7FA",
        cta: { label: "К электростанциям", url: "#stantsii" },
      },
      about: {
        eyebrow: "Глава 01 · О компании",
        title: "Опт, розница и доставка по всей России.",
        textBlock1:
          "Работаем с частными покупателями и с организациями: подберём станцию под квартиру, дачу, мастерскую или поставку на объект. Доставка — по всей России, итоговую стоимость подтверждаем в день отправки.",
        textBlock2:
          "Оборудование сопровождается декларацией соответствия. Актуальный документ: [Декларация соответствия](/legal/deklaraciya-sootvetstviya).",
        spacing: "L",
      },
      naboryPreview: {
        eyebrow: "Глава 03",
        title: "Солнечные панели",
        subtitle:
          "Складные панели 60, 100 и 200 W, чтобы станция заряжалась без розетки.",
        linkLabel: "Все панели",
      },
      tovaryPreview: {
        eyebrow: "Глава 02",
        title: "Портативные электростанции",
        subtitle:
          "От компактной розетки для гаджетов до резерва для дома и мастерской.",
        linkLabel: "Все станции",
      },
      articlesPreview: {
        eyebrow: "Глава 04",
        title: "Статьи",
        subtitle:
          "Как выбрать мощность, что потянет станция и зачем держать резерв дома.",
        linkLabel: "Все статьи",
      },
    };

    await upsertSingle(strapi, "api::products-page.products-page", {
      eyebrow: "Глава 02",
      seo: {
        title: "Портативные электростанции — Voltora",
        description:
          "Каталог портативных электростанций CTECHi, Famlink Power и NP: мощность, ёмкость, порты и цена.",
      },
      title: "Электростанции",
      emptyStateText: "Станции скоро появятся.",
      emptyStateLinkLabel: "Вернуться на главную",
      intro:
        "Подберите станцию по мощности и ёмкости: от зарядки гаджетов до резерва для холодильника, котла и мастерской.",
    });

    await upsertSingle(strapi, "api::rituals-page.rituals-page", {
      eyebrow: "Глава 03",
      seo: {
        title: "Солнечные панели — Voltora",
        description:
          "Складные солнечные панели CTECHi 60, 100 и 200 W для зарядки портативных электростанций.",
      },
      title: "Солнечные панели",
      emptyStateText: "Панели скоро появятся.",
      emptyStateLinkLabel: "Вернуться на главную",
      intro:
        "Складные панели, чтобы продлить автономность станции на даче, в поездке и при перебоях с сетью.",
    });

    await upsertSingle(strapi, "api::articles-page.articles-page", {
      eyebrow: "Глава 04",
      seo: {
        title: "Статьи об электростанциях — Voltora",
        description:
          "Как выбрать портативную электростанцию для квартиры, дачи и резервного питания в Москве и по России.",
      },
      title: "Статьи",
      emptyStateText: "Статьи скоро появятся.",
      emptyStateLinkLabel: "Вернуться на главную",
      intro:
        "Короткие разборы мощности, автономности и бытовых сценариев — без лишнего шума генератора.",
    });

    await upsertSingle(strapi, "api::robots-txt.robots-txt", {
      content: `User-agent: *
Allow: /

Disallow: /api/
Disallow: /checkout
Disallow: /legal/

Sitemap: ${process.env.SITE_URL ?? "http://localhost:3001"}/sitemap.xml
`,
    });

    const productDocuments = strapi.documents("api::product.product");
    const desiredProductKeys = new Set(products.map((product) => product.key));
    for (const product of await productDocuments.findMany()) {
      const seedKey = product.seedKey;
      if (
        typeof seedKey === "string" &&
        seedKey.length > 0 &&
        !desiredProductKeys.has(seedKey)
      ) {
        await productDocuments.delete({ documentId: product.documentId });
      }
    }
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
        story: paragraph(operation.record.story),
        title: `${operation.record.type === "nabor" ? "Панель" : "Станция"}: ${operation.record.title}`,
        displayName: operation.record.title,
        seedKey: operation.record.key,
        categoryLabel: operation.record.categoryLabel,
        catalogRoute: operation.record.type === "nabor" ? "paneli" : "stantsii",
        seo: operation.record.seo,
      };
      delete productData.key;
      delete productData.imageAsset;
      delete productData.imageAlt;

      if (operation.type === "update" && operation.slug) {
        productData.slug = operation.slug;
      }

      const imageAsset = operation.record.imageAsset;
      Object.assign(productData, {
        gallery: [],
        ...(imageAsset
          ? {
              mainImage: mainImage(
                imageAsset,
                operation.record.imageAlt || operation.record.title,
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
    const relationIds = (keys: readonly string[]) =>
      keys.flatMap((key) => {
        const documentId = productIdBySeedKey.get(key);
        return documentId ? [documentId] : [];
      });

    const articleDocuments = strapi.documents("api::article.article");
    const desiredArticles = [
      {
        key: "article-moscow-apartment-reserve",
        name: "Резерв для квартиры в Москве: свет, связь и работа без генератора",
        priority: 20,
        imageAsset: "ctechi-gt500.png",
        seo: {
          title: "Портативная электростанция для квартиры в Москве — Voltora",
          description:
            "Зачем держать портативную электростанцию в московской квартире: роутер, свет, ноутбук и тихий резерв без запаха топлива.",
        },
        content:
          "<p>В Москве отключение на пару часов уже не редкость. Для квартиры это роутер, свет, ноутбук и заряд телефонов — как раз то, что закрывает тихая станция в комнате, без генератора во дворе.</p><p>Модели 300–500 W хватает на связь и работу. Если нужен холодильник или котёл, смотрите пусковой ток и ёмкость. Держите станцию заряженной: это короткая страховка, а не запас «на конец света».</p>",
      },
      {
        key: "article-why-reserve-now",
        name: "Почему автономный резерв в России стал бытовой нормой",
        priority: 10,
        imageAsset: "ctechi-gt1200.png",
        seo: {
          title: "Зачем нужна портативная электростанция в России сейчас — Voltora",
          description:
            "Перебои, нагрузка на инфраструктуру и военные действия рядом с повседневной жизнью: зачем держать тихий электрический резерв дома.",
        },
        content:
          "<p>Станцию больше не берут «на рыбалку». Запрос другой: сохранить связь, интернет и быт, когда сеть пропадает на вечер. Для Москвы и городов с нагрузкой на инфраструктуру это уже бытовой резерв.</p><p>Рядом идут военные действия — даже в тылу это ощущается косвенно: отключения, логистика, спрос на генераторы. Дома выигрывает тихая станция: кнопка, без топлива и выхлопа. Как аптечка: надеешься не воспользоваться.</p>",
      },
    ] as const;

    const desiredArticleKeys = new Set(
      desiredArticles.map((article) => article.key),
    );
    for (const article of await articleDocuments.findMany()) {
      const seedKey = article.seedKey;
      if (
        typeof seedKey === "string" &&
        seedKey.length > 0 &&
        !desiredArticleKeys.has(seedKey)
      ) {
        await articleDocuments.delete({ documentId: article.documentId });
      }
    }
    const existingArticles = await articleDocuments.findMany();
    const existingArticlesBySeedKey = existingArticles.flatMap((article) => {
      const desired = desiredArticles.find(
        (candidate) => candidate.key === article.seedKey,
      );
      return desired
        ? [
            {
              key: desired.key,
              documentId: article.documentId,
              slug: article.slug,
            },
          ]
        : [];
    });

    for (const operation of planSeed(
      desiredArticles,
      existingArticlesBySeedKey,
    )) {
      const articleData: Record<string, unknown> = {
        ...operation.record,
        seedKey: operation.record.key,
        image: imageByAsset.get(operation.record.imageAsset)?.id ?? null,
      };
      delete articleData.key;
      delete articleData.imageAsset;

      if (operation.type === "update" && operation.slug) {
        articleData.slug = operation.slug;
      }

      if (operation.type === "update" && operation.documentId) {
        await articleDocuments.update({
          documentId: operation.documentId,
          data: articleData,
          status: "published",
        });
      } else {
        await articleDocuments.create({
          data: articleData,
          status: "published",
        });
      }
    }

    const publishedArticles = await articleDocuments.findMany({
      status: "published",
    });
    const articleIdBySeedKey = new Map(
      publishedArticles.map((article) => [
        String(article.seedKey),
        article.documentId,
      ]),
    );
    await upsertSingle(strapi, "api::home-page.home-page", {
      ...homePageData,
      featuredNabory: { set: relationIds(FEATURED_PANEL_KEYS) },
      featuredTovary: { set: relationIds(FEATURED_STATION_KEYS) },
      featuredArticles: {
        set: desiredArticles.flatMap((article) => {
          const documentId = articleIdBySeedKey.get(article.key);
          return documentId ? [documentId] : [];
        }),
      },
    });

    await grantPublicStorefrontRead(strapi);
  } finally {
    await strapi.destroy();
  }
}

await run();
