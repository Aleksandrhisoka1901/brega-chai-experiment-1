import { createServer } from "node:http";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const port = Number(process.env.CMS_FIXTURE_PORT ?? 14338);
let orderRequests = 0;

function product(slug, stock) {
  return {
    documentId: `document-${slug}`,
    slug,
    type: "product",
    title: stock > 0 ? "Да Хун Пао" : "Шу Пуэр",
    originalTitle: stock > 0 ? "大红袍" : null,
    packageLabel: "50 г",
    price: stock > 0 ? 1600 : 1200,
    currency: "RUB",
    stock,
    cardExcerpt: "Минеральный утёсный улун.",
    story: "Чай для долгого тихого вечера.",
    articleContent: [
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", text: "Как раскрывается чай" }],
      },
      {
        type: "paragraph",
        children: [{ type: "text", text: "Заваривайте короткими проливами." }],
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

  if (url.pathname === "/__test/orders-count") {
    if (request.method === "DELETE") orderRequests = 0;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ count: orderRequests }));
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
          packageLabel: "50 г",
          unitPriceRubles: 1600,
          quantity: item.quantity,
          lineTotalRubles: 1600 * item.quantity,
          currency: "RUB",
        }));
        response.writeHead(201, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            data: {
              orderId: "E2E-0001",
              status: "new",
              currency: "RUB",
              lines,
              totalRubles: lines.reduce(
                (total, line) => total + line.lineTotalRubles,
                0,
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
            title: "Чай как ежедневный ритуал",
            text: "Спокойная чайная практика.",
            layout: "100/0",
          },
          about: {
            text: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Чай без спешки." }],
              },
            ],
            spacing: "M",
          },
          ritualsPreview: { title: "Ритуалы" },
          productsPreview: { title: "Сорта" },
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
          brandName: "Brega Chai",
          email: "hello@brega.test",
          telegramUrl: "https://t.me/brega",
          navigation: {
            about: "О проекте",
            rituals: "Ритуалы",
            products: "Сорта",
            cart: "Корзина",
          },
          legalDetails: "ИП Иванов\nИНН 123456789012",
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
          title: "Чай, выбранный для внимания",
          intro: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  text: "Небольшая коллекция без спешки и рейтингов.",
                },
              ],
            },
          ],
          seo: {
            title: "Сорта чая — Brega Chai",
            description: "Все сорта чая Brega Chai.",
          },
        },
      }),
    );
    return;
  }

  if (!slug && type === "ritual") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data: [] }));
    return;
  }

  if (!slug && type === "product" && pageSize === "4") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data: [product("published-product", 12)] }));
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
