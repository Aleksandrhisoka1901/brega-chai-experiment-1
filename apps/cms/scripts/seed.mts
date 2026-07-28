import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertSeedAllowed,
  planSeed,
  PUBLIC_STOREFRONT_ACTIONS,
} from "./seed-helpers.ts";

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

const products = [
  {
    key: "ritual-evening",
    title: "Вечерний чайный ритуал",
    type: "ritual",
    originalTitle: "Evening tea ritual",
    packageLabel: "Набор",
    price: 4200,
    currency: "RUB",
    stock: 7,
    active: true,
    sortOrder: 10,
    cardExcerpt:
      "Спокойный вечерний набор для знакомства с церемониальным чаем.",
    story: "Посуда и чай собраны в единый неторопливый сценарий.",
    imageAsset: "ritual-evening.png",
  },
  {
    key: "product-da-hong-pao",
    title: "Да Хун Пао",
    type: "product",
    originalTitle: "大红袍",
    packageLabel: "50 г",
    price: 1600,
    currency: "RUB",
    stock: 12,
    active: true,
    sortOrder: 20,
    cardExcerpt: "Минеральный утёсный улун с тёплым древесным ароматом.",
    story: "Выразительный чай для нескольких коротких проливов.",
    articleContent: [
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
            text: "Первые проливы дают тёплый древесный аромат, затем проявляются минеральность и мягкая фруктовая сладость.",
          },
        ],
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
    ],
    imageAsset: "tea-leaves.png",
  },
  {
    key: "product-sold-out",
    title: "Гёкуро Асахи",
    type: "product",
    packageLabel: "40 г",
    price: 2400,
    currency: "RUB",
    stock: 0,
    active: true,
    sortOrder: 30,
    cardExcerpt: "Глубокий японский зелёный чай с насыщенным вкусом умами.",
    story: "Низкая температура воды раскрывает сладость и морскую свежесть.",
    imageAsset: "tea-leaves.png",
  },
  {
    key: "product-without-image",
    title:
      "Шэн пуэр выдержанный — длинное тестовое название карточки для проверки предельной длины заголовка каталога и переноса текста в интерфейсе",
    type: "product",
    packageLabel: "Блин 100 г",
    price: 3100,
    currency: "RUB",
    stock: 3,
    active: true,
    sortOrder: 40,
    cardExcerpt:
      "Этот намеренно длинный кураторский анонс проверяет предельную длину текста карточки, перенос строк и устойчивость каталожной сетки на разных ширинах экрана. У товара также отсутствуют все необязательные поля и изображение, поэтому storefront обязан показать контролируемый placeholder без нарушения композиции.",
    story:
      "Чистый fixture без изображения, оригинального названия, галереи и SEO.",
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
          alternativeText: `Seed placeholder: ${basename(name, ".png")}`,
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
    for (const asset of ["ritual-evening.png", "tea-leaves.png"]) {
      imageByAsset.set(asset, await uploadSeedAsset(strapi, asset));
    }

    const defaultSeo = {
      title: "Brega Chai — чай и ритуалы",
      description: "Отборный чай, посуда и готовые ритуалы для дома.",
    };
    const mainImage = (asset: string, alt: string) => ({
      image: imageByAsset.get(asset)?.id,
      alt,
    });

    await upsertSingle(strapi, "api::global-setting.global-setting", {
      brandName: "Brega Chai",
      email: "hello@example.test",
      telegramUrl: "https://t.me/example",
      defaultProductStory: paragraph(
        "Каждый чай отобран для ясного и спокойного домашнего ритуала.",
      ),
      navigation: {
        about: "О проекте",
        rituals: "Ритуалы",
        products: "Сорта",
        cart: "Корзина",
      },
      currency: "RUB",
      defaultSeo,
      legalDetails: "Тестовые реквизиты для локальной разработки.",
    });

    await upsertSingle(strapi, "api::home-page.home-page", {
      seo: defaultSeo,
      hero: {
        title: "Чай как ежедневный ритуал",
        text: "Наборы и сорта, которые помогают остановиться и почувствовать вкус момента.",
        layout: "50/50",
        image: mainImage(
          "ritual-evening.png",
          "Чайная посуда на спокойном светлом фоне",
        ),
        backgroundColor: "#E8DED0",
        textColor: "#26231F",
        cta: { label: "Выбрать чай", url: "#products" },
      },
      about: {
        text: paragraph(
          "Brega Chai собирает понятную домашнюю чайную практику без лишней церемониальности.",
        ),
        spacing: "L",
      },
      ritualsPreview: {
        title: "Ритуалы",
        subtitle: "Всё необходимое для готового чайного сценария.",
      },
      productsPreview: {
        title: "Сорта",
        subtitle: "Чай для самостоятельного знакомства.",
      },
    });

    await upsertSingle(strapi, "api::products-page.products-page", {
      seo: {
        title: "Сорта чая — Brega Chai",
        description: "Все сорта чая Brega Chai.",
      },
      title: "Сорта",
      intro: paragraph(
        "Исследуйте чай через происхождение, аромат и собственный ритм заваривания.",
      ),
    });

    const productDocuments = strapi.documents("api::product.product");
    const existingProducts = await productDocuments.findMany();
    const existingBySeedKey = existingProducts.flatMap((product) => {
      const desired = products.find(
        (candidate) => candidate.key === product.seedKey,
      );
      return desired
        ? [{ key: desired.key, documentId: product.documentId }]
        : [];
    });

    for (const operation of planSeed(products, existingBySeedKey)) {
      const productData: Record<string, unknown> = {
        ...operation.record,
        seedKey: operation.record.key,
      };
      delete productData.key;
      delete productData.imageAsset;

      const imageAsset =
        "imageAsset" in operation.record
          ? operation.record.imageAsset
          : undefined;
      Object.assign(productData, {
        ...(imageAsset
          ? {
              mainImage: mainImage(
                imageAsset,
                `${operation.record.title}: тестовое изображение товара`,
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

    await grantPublicStorefrontRead(strapi);
  } finally {
    await strapi.destroy();
  }
}

await run();
