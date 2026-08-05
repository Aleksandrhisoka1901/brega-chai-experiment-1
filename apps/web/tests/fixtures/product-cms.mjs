import { createServer } from "node:http";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const port = Number(process.env.CMS_FIXTURE_PORT ?? 14338);
let orderRequests = 0;

function product(slug, stock) {
  const title = stock > 0 ? "Да Хун Пао" : "Шу Пуэр";
  return {
    documentId: `document-${slug}`,
    slug,
    type: "tovar",
    breadcrumbLabel: null,
    categoryLabel: "сорт чая",
    title: `Сорт: ${title}`,
    displayName: title,
    originalTitle: stock > 0 ? "Большой красный халат" : null,
    packageLabel: "Пакетик (50 г)",
    price: stock > 0 ? 1600 : 1200,
    currency: "RUB",
    stock,
    cardExcerpt: "Минеральный утёсный улун.",
    story: "Чай для долгого тихого вечера.",
    seo: {
      title: `${title} — сорт чая Brega Tea`,
      description: "Минеральный утёсный улун.",
    },
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
              { type: "text", text: "Заваривайте короткими проливами." },
            ],
          },
        ],
      },
      {
        content: [
          {
            type: "heading",
            level: 2,
            children: [{ type: "text", text: "Хранение чая" }],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Храните чай вдали от света и сильных запахов.",
              },
            ],
          },
        ],
      },
    ],
    mainImage: {
      alt: "Пачка чая",
      image: {
        url: png,
        width: 800,
        height: 1000,
      },
    },
    gallery: [
      {
        alt: "Сухой чайный лист",
        image: {
          url: png,
          width: 800,
          height: 800,
        },
      },
      {
        alt: "Чай в пиале",
        image: {
          url: png,
          width: 800,
          height: 800,
        },
      },
    ],
  };
}

const cms = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:14338");
  const slug = url.searchParams.get("filters[slug][$eq]");
  const type = url.searchParams.get("filters[type][$eq]");
  const pageSize = url.searchParams.get("pagination[pageSize]");

  if (url.pathname === "/api/health/readiness") {
    response.writeHead(204).end();
    return;
  }

  if (url.pathname === "/__test/orders-count") {
    if (request.method === "DELETE") orderRequests = 0;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ count: orderRequests }));
    return;
  }

  if (/^\/uploads\/legal-[a-z-]+\.pdf$/.test(url.pathname)) {
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end("%PDF-1.4\n%%EOF\n");
    return;
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    orderRequests += 1;
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      if (
        request.headers.authorization !== "Bearer e2e-scoped-order-token" ||
        !request.headers["idempotency-key"]
      ) {
        response.writeHead(401).end();
        return;
      }

      const order = JSON.parse(raw);
      if (order.comment === "TRIGGER_ERROR") {
        response.writeHead(503, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "fixture failure" }));
        return;
      }

      const finish = () => {
        const lines = order.items.map((item) => ({
          productId: item.productId,
          slug: "published-product",
          title: "Да Хун Пао",
          packageLabel: "Пакетик (50 г)",
          unitPriceRubles: 1600,
          quantity: item.quantity,
          lineTotalRubles: 1600 * item.quantity,
          currency: "RUB",
        }));
        const totalRubles = lines.reduce(
          (total, line) => total + line.lineTotalRubles,
          0,
        );
        const pickupDiscountPercent =
          order.deliveryMethod === "pickup" ? 10 : 0;
        response.writeHead(201, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            data: {
              orderId: "order-e2e-1",
              orderNumber: "2607-0001",
              status: "new",
              deliveryMethod: order.deliveryMethod,
              pickupDiscountPercent,
              currency: "RUB",
              lines,
              totalRubles,
              discountedTotalRubles: Math.round(
                (totalRubles * (100 - pickupDiscountPercent)) / 100,
              ),
            },
          }),
        );
      };

      if (order.comment === "DOUBLE_CLICK") setTimeout(finish, 500);
      else finish();
    });
    return;
  }

  if (url.pathname === "/api/home-page") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: {
          hero: {
            eyebrow: "Чай как личная практика",
            title: "У времени есть вкус.",
            text: "Небольшая коллекция чая и предметов для тех моментов, когда спешить больше некуда.",
            layout: "40/60",
            backgroundColor: null,
            textColor: null,
            cta: {
              label: "К ритуалам",
              url: "#nabory",
            },
            image: {
              alt: "Чайная посуда",
              image: {
                url: png,
                width: 800,
                height: 1000,
              },
            },
          },
          about: {
            eyebrow: "Глава 01 · О проекте",
            title: "Вещи обретают смысл, когда становятся частью привычки.",
            textBlock1:
              "Мы собираем чай, посуду и простые инструкции в цельные сценарии — для утра, разговора, одиночества или подарка.",
            textBlock2:
              "Ассортимент короткий намеренно. Здесь не нужно сравнивать десятки почти одинаковых позиций.",
            spacing: "M",
          },
          naboryPreview: {
            eyebrow: "Глава 02",
            title: "Ритуалы",
            subtitle: "Готовые сценарии для чайной паузы.",
          },
          tovaryPreview: {
            eyebrow: "Глава 03",
            title: "Сорта",
            subtitle: "Чай для знакомства и ежедневных церемоний.",
            linkLabel: "Все сорта",
          },
          featuredNabory: [
            { ...product("ritual-one", 12), type: "nabor" },
            { ...product("ritual-two", 12), type: "nabor" },
            { ...product("ritual-three", 12), type: "nabor" },
            { ...product("ritual-four", 12), type: "nabor" },
          ],
          featuredTovary: [
            product("published-product", 12),
            product("green-tea", 0),
            product("aged-tea", 12),
            product("evening-tea", 12),
          ],
        },
      }),
    );
    return;
  }

  if (url.pathname === "/api/global-setting") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: {
          brandName: "Brega Tea",
          pickupAddress:
            "г. Москва, ул. Чайная, д. 1. Ежедневно с 10:00 до 22:00.",
          pickupDiscountPercent: 10,
          courierDeliveryNote:
            "Стоимость рассчитывается в день отправки, до 1000 руб.",
          email: "hello@brega.test",
          telegramUrl: "https://t.me/brega_chai",
          navigation: {
            about: "О проекте",
            nabory: "Ритуалы",
            tovary: "Сорта",
            cart: "Корзина",
          },
          sectionBreadcrumbs: [
            { route: "nabory", label: "Ритуалы" },
            { route: "tovary", label: "Сорта" },
          ],
          storefrontTexts: {
            imagePlaceholder: "Изображение готовится",
            outOfStock: "Нет в наличии",
          },
          legalDetails: "ИП Иванов Иван. ИНН 123456789",
          legalDocuments: {
            privacyPolicy: {
              mime: "application/pdf",
              url: "/uploads/legal-privacy.pdf",
            },
            terms: {
              mime: "application/pdf",
              url: "/uploads/legal-terms.pdf",
            },
            deliveryAndReturns: {
              mime: "application/pdf",
              url: "/uploads/legal-delivery-and-returns.pdf",
            },
          },
          defaultProductStory: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  text: "Каждый чай отобран для спокойного домашнего ритуала.",
                },
              ],
            },
          ],
          defaultSeo: {
            title: "Brega Tea",
            description: "Чай и ритуалы Brega Tea",
          },
        },
      }),
    );
    return;
  }

  if (url.pathname === "/api/products-page") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: {
          eyebrow: "Глава 03",
          title: "Сорта",
          emptyStateText: "Сорта скоро появятся.",
          emptyStateLinkLabel: "Вернуться на главную",
          intro: "Небольшая коллекция без спешки и рейтингов.",
          seo: {
            title: "Сорта чая — Brega Tea",
            description: "Все сорта чая Brega Tea.",
          },
        },
      }),
    );
    return;
  }

  if (!slug && type === "nabor") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: [
          { ...product("ritual-one", 12), type: "nabor" },
          { ...product("ritual-two", 12), type: "nabor" },
          { ...product("ritual-three", 12), type: "nabor" },
          { ...product("ritual-four", 12), type: "nabor" },
        ],
      }),
    );
    return;
  }

  if (!slug && type === "tovar" && pageSize === "4") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: [
          product("published-product", 12),
          product("green-tea", 0),
          product("aged-tea", 12),
          product("evening-tea", 12),
        ],
      }),
    );
    return;
  }

  if (!slug && type === "tovar") {
    const products = [
      product("published-product", 12),
      product("green-tea", 0),
      product("aged-tea", 12),
      product("evening-tea", 12),
      product("white-tea", 12),
      product("red-tea", 12),
    ];
    const availableOnly = url.searchParams.has("filters[stock][$gt]");
    const unavailableOnly = url.searchParams.has("filters[stock][$eq]");
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: products.filter((entry) =>
          availableOnly
            ? entry.stock > 0
            : unavailableOnly
              ? entry.stock === 0
              : true,
        ),
      }),
    );
    return;
  }

  if (slug && type === "nabor" && ["ritual-one", "ritual-two"].includes(slug)) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        data: [
          {
            ...product(slug, 6),
            type: "nabor",
            categoryLabel: "чайный ритуал",
            title: `Ритуал: ${
              slug === "ritual-one" ? "Утро без слов" : "После дождя"
            }`,
            displayName:
              slug === "ritual-one" ? "Утро без слов" : "После дождя",
            originalTitle: null,
            packageLabel: "Набор",
            seo: {
              title: `${
                slug === "ritual-one" ? "Утро без слов" : "После дождя"
              } — чайный ритуал Brega Tea`,
              description: "Чайный сценарий.",
            },
          },
        ],
      }),
    );
    return;
  }

  if (!slug || slug === "unavailable-product") {
    response.writeHead(503).end();
    return;
  }

  const data =
    slug === "published-product"
      ? [product(slug, 12)]
      : slug === "out-of-stock-product"
        ? [product(slug, 0)]
        : [];

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ data }));
});

cms.listen(port, "127.0.0.1");

function shutdown() {
  cms.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
