# Brega Chai — техническая архитектурная спецификация

Статус: основная архитектура реализована; production-readiness завершается по
`development-plan.md`. Поздние уточнения checkout, каталога и управления
заказами зафиксированы в соответствующих отдельных спецификациях.

Связанный документ: [продуктовая спецификация](./product-spec.md)

Референсная кодовая база: `~/Projects/external-projects/metal-constructions`
Дата: 27 июля 2026
Актуализировано: 3 августа 2026

## 1. Архитектурное решение

Стек `Next.js + Radix + Strapi + PostgreSQL` подходит проекту.

Почему:

- Next.js App Router закрывает SSR/SSG, metadata, image optimization, route handlers и SEO без отдельного backend-for-frontend;
- Strapi соответствует редакционной модели: singleton-страницы, коллекция товаров, draft/publish, медиабиблиотека и роли;
- Radix даёт доступное поведение сложным интерактивным элементам — drawer/dialog, счётчикам, навигации и состояниям формы — без навязывания готовой магазинной эстетики;
- PostgreSQL подходит одновременно для Strapi-контента и заказов;
- Docker позволяет разнести storefront, CMS и БД, сохранив локальный и production parity.

Главная оговорка: это не готовая ecommerce-платформа. Корзину, серверное создание заказа, фиксацию цены, идемпотентность, доставку и оплату потребуется реализовать как отдельный небольшой commerce-контур.

## 2. Что переносим из `metal-constructions`

### 2.1. Переносим как основу

- монорепозиторий на Yarn workspaces и Turborepo;
- Node.js с зафиксированной major-версией;
- отдельные приложения Next.js и Strapi;
- Strapi 5 + PostgreSQL;
- TypeScript strict;
- App Router;
- единый типизированный CMS client;
- разделение internal/public CMS URL;
- timeout и типизированные ошибки CMS;
- безопасное состояние при недоступности CMS;
- SEO helpers для canonical, metadata и breadcrumbs;
- управляемые через Strapi `robots.txt` и sitemap, JSON-LD;
- локальные шрифты через `next/font`;
- Playwright + axe;
- ESLint, Prettier, typecheck и CI gates;
- Zod для входных данных публичных endpoint;
- rate limiting для публичных форм/заказов.

### 2.2. Адаптируем

| В `metal-constructions`                          | В Brega Chai                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `packages/web`, `packages/admin`, `packages/lib` | `apps/web`, `apps/cms`, `packages/contracts`; UI остаётся внутри `apps/web`                            |
| React Query гидратируется в публичный контент    | Публичный контент читается в React Server Components; React Query не нужен по умолчанию                |
| Root layout `force-dynamic`                      | Статический/cache-first layout с tag-based revalidation                                                |
| Общая библиотека содержит UI и формы             | Shared package хранит прежде всего схемы, DTO и чистые domain-функции                                  |
| Strapi sitemap plugin                            | Strapi 5 plugin генерирует sitemap; middleware проксирует его на публичный `/sitemap.xml`               |
| Lead endpoint                                    | Order endpoint с повторной проверкой цен, идемпотентностью и адаптерами доставки/оплаты                |
| Privacy как HTML-страница                        | Юридические PDF редактируются в Strapi и доступны по стабильным маршрутам `/legal/*.pdf`               |
| Radix Themes задаёт большую часть оформления     | Radix используется для поведения; editorial visual language задают CSS tokens и собственные компоненты |

### 2.3. Не переносим

- глобальный `force-dynamic`;
- обязательный TanStack Query для CMS-контента;
- дублирование одних DTO вручную в нескольких пакетах;
- generic CRUD-методы CMS client в публичном client bundle;
- прямое создание заказа через публичный Strapi CRUD;
- хранение цены заказа только как ссылки на текущий товар;
- module-level mutable state для rate limiting в production;
- React Toastify, если достаточно локального accessible live region.

## 3. Целевой стек

Версии фиксируются при инициализации проекта после проверки совместимости. Не использовать плавающий `latest`.

| Слой                   | Выбор                                             | Назначение                                                                      |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime                | Node.js 22 LTS                                    | единый runtime web/CMS/tooling                                                  |
| Package manager        | Yarn 4.14.1                                       | workspaces, lockfile                                                            |
| Orchestration          | Turborepo                                         | dev/build/test/typecheck pipelines                                              |
| Frontend               | Next.js 15.5.21 App Router + React + TypeScript   | storefront и BFF                                                                |
| UI behavior            | Radix Primitives                                  | dialog/drawer, focus management и accessible primitives                         |
| Icons                  | `lucide-react`                                    | единый tree-shakeable набор интерфейсных SVG-иконок                             |
| Styling                | CSS Modules + global design tokens                | кастомная журнальная стилистика                                                 |
| CMS                    | Strapi 5.45.0                                     | товары, страницы, SEO, заказы                                                   |
| CMS color field        | `@strapi/plugin-color-picker` 5.45.0              | HEX color picker для Hero и «О проекте»; версия обновляется синхронно со Strapi |
| CMS sitemap            | `strapi-5-sitemap-plugin` 1.0.8                   | Sitemap из опубликованных документов с настройками в Strapi Admin               |
| Database               | PostgreSQL 16                                     | Strapi content и orders; точный patch/image digest фиксируется при bootstrap    |
| Validation             | Zod                                               | формы, API payload, env                                                         |
| Forms                  | React Hook Form + Zod resolver                    | checkout                                                                        |
| Phone mask             | `react-imask` 7.6.1                               | ввод, caret, paste, autofill и очистка российского номера                       |
| Phone                  | libphonenumber-js                                 | parse и E.164 normalization                                                     |
| Cart state             | собственный store на `useSyncExternalStore`       | клиентская корзина без отдельной state-библиотеки                               |
| Rich content           | repeatable-компонент с Better Blocks              | несколько упорядоченных статей товара                                           |
| E2E                    | Playwright + axe-core                             | критические сценарии                                                            |
| Unit/integration tests | встроенный Node test runner                       | domain, mapper и service tests без отдельного test framework                    |
| Containers             | Docker Compose local; отдельные production images | воспроизводимый deploy                                                          |

### 3.1. Radix Primitives

Проект использует только Radix Primitives; Radix Themes не подключается.

Radix отвечает за механику Dialog, VisuallyHidden, Accessible Icon и управление focus. Карточки, типографика, секции, кнопки, сетки и все визуальные tokens реализуются собственной дизайн-системой.

## 4. Контекстная схема

```text
┌────────────┐       HTTPS        ┌─────────────────────┐
│ Покупатель │ ─────────────────► │ Next.js storefront  │
└────────────┘                     │ RSC + BFF endpoints │
                                   └───────┬──────┬──────┘
                                           │
                             server-only   │
                                           ▼
                                   ┌──────────┐
                                   │ Strapi 5 │
                                   └────┬─────┘
                                        │
                                        ▼
                                  ┌────────────┐
                                  │ PostgreSQL │
                                  └────────────┘
                                        ▲
                                        │
                                  ┌─────┴──────┐
                                  │ Редактор   │
                                  │ Strapi UI  │
                                  └────────────┘
```

Браузер не обращается к приватным Strapi endpoints и API доставки/оплаты напрямую. Next.js выступает BFF и границей доверия.

## 5. Структура репозитория

```text
/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── product/
│   │   │   │   └── navigation/
│   │   │   ├── server/
│   │   │   │   ├── cms/
│   │   │   │   ├── commerce/
│   │   │   │   └── security/
│   │   │   ├── lib/
│   │   │   │   ├── seo/
│   │   │   │   ├── money/
│   │   │   │   └── env/
│   │   │   └── styles/
│   │   ├── tests/
│   │   └── Dockerfile
│   └── cms/
│       ├── src/api/
│       ├── src/components/
│       ├── config/
│       ├── tests/
│       └── Dockerfile
├── packages/
│   ├── contracts/
│   │   └── src/
│   │       ├── order.ts
│   │       └── product.ts
├── docs/
├── docker-compose.yml
├── package.json
├── turbo.json
└── yarn.lock
```

Не создавать `packages/ui` или общий `utils`-пакет заранее. UI и design tokens живут в `apps/web`; другой код выносится в package только при наличии стабильной границы и минимум двух потребителей.

## 6. Маршруты Next.js

```text
src/app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
├── error.tsx
├── global-error.tsx
├── robots.txt/
│   └── route.ts
├── manifest.ts
├── products/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── rituals/
│   └── [slug]/page.tsx
└── api/
    ├── checkout/
    │   └── orders/route.ts
    └── revalidate/
        └── route.ts
```

Checkout не обязан иметь отдельную страницу: UI может жить в drawer, а HTTP endpoints остаются обычными route handlers.

## 7. Rendering и границы React

### 7.1. Базовый режим

Server Components по умолчанию:

- layout/header/footer;
- главная и её контентные секции;
- каталожная сетка;
- товарная информация;
- rich content;
- metadata и JSON-LD.

Client Components только для:

- мобильного меню;
- горизонтального слайдера;
- товарной галереи;
- счётчика;
- корзины;
- checkout;
- live announcements;

Не ставить `'use client'` на страницы или крупные layout-компоненты.

### 7.2. Передача данных на клиент

- Передавать минимальные DTO, а не полный Strapi response.
- В cart item достаточно `id`, `slug`, `type`, `title`, `packageLabel`, display image и последней известной цены.
- Сервер никогда не доверяет цене из cart DTO.
- Rich content остаётся на сервере и не сериализуется в checkout bundle.

### 7.3. Параллелизм

На главной независимые запросы `HomePage`, `rituals` и `products preview` запускаются параллельно. Общие настройки дедуплицируются на запрос.

Вложенные запросы по одному товару не выполняются последовательно, если Strapi может вернуть нужные relations одним явно ограниченным populate.

## 8. CMS data access

### 8.1. Принципы

- Все CMS-функции располагаются в `src/server/cms` и помечаются `server-only`.
- Strapi response преобразуется mapper-слоем в frontend DTO.
- Компоненты не знают о `data.attributes`, `documentId` или Strapi populate syntax.
- Public content читается через строго разрешённую Public role Strapi, которая видит только опубликованные публичные типы.
- Admin token никогда не попадает в `NEXT_PUBLIC_*`.
- На каждый запрос установлен timeout.
- Ошибки разделены на not found, validation, unauthorized и unavailable.

### 8.2. Запросы

Создать узкие функции:

- `getGlobalSettings()`;
- `getHomePage()`;
- `getProductsPreview(limit)`;
- `getProducts()`;
- `getProductBySlug(type, slug)`;
- `getProductSeoBySlug(type, slug)`;

Не экспортировать generic `get/post/put/delete` в UI-слой.

### 8.3. Populate

- Использовать явный allowlist полей и relations.
- Не использовать бесконтрольный deep populate.
- Для listing и detail создать разные projections.
- Listing не получает gallery и articles.
- Sitemap строится внутри Strapi plugin по узкой конфигурации типа `product` и
  не запрашивает изображения или статьи.

## 9. Кэширование и публикация

### 9.1. Стратегия

Контент storefront кэшируется по смысловым tags:

- `global`;
- `home`;
- `products`;
- `product-slug:{type}:{slug}`.

Каталог и продуктовые страницы допускают stale-while-revalidate. Checkout, quote и order creation всегда `no-store`.

### 9.2. Webhook Strapi

После publish, unpublish или изменения уже опубликованного storefront-контента
Strapi вызывает:

`POST /api/revalidate`

Webhook подписывает точные JSON bytes через
`X-Revalidation-Signature: sha256=<hex(HMAC-SHA256(secret, rawBody))>`. Подпись
проверяется до JSON parse в постоянное время. Используется отдельный
server-only secret; подпись, secret и payload не логируются.

Строгий envelope:

```json
{
  "id": "event-id",
  "event": "product",
  "action": "publish",
  "occurredAt": "2026-07-29T12:00:00.000Z",
  "product": {
    "documentId": "string",
    "type": "tovar",
    "slug": "sencha"
  }
}
```

Разрешены `home`, `global`, `products`, `product` и действия `publish`,
`update`, `unpublish`. Сохранение draft не отправляет событие. Для product
обязательны `documentId`, `type` и `slug`; произвольные tags/paths и лишние поля
не принимаются.

| Event      | Tags                                     | Paths                                                                 |
| ---------- | ---------------------------------------- | --------------------------------------------------------------------- |
| `global`   | `global`                                 | публичный layout                                                      |
| `home`     | `home`                                   | `/`                                                                   |
| `products` | `products`                               | `/tovary`                                                      |
| `product`  | `products`, `product-slug:{type}:{slug}` | `/`, `/tovary`, `/tovary/{slug}` или `/nabory/{slug}`          |

Next.js хранит bounded in-memory registry `id → body digest`. Точный повтор
возвращает успех без повторной invalidation, а тот же ID с другим payload
отклоняется. После рестарта повторная invalidation допустима и безопасна.

Недоступность webhook не откатывает публикацию в Strapi: sender использует
короткий timeout, возвращает безопасный результат и пишет предупреждение без
payload. Для MVP сохраняется дополнительный TTL cache refresh; durable queue и
dead-letter добавляются только при появлении нескольких web instances или
требования к гарантированной мгновенной доставке.

Slug продукта создаётся один раз до сохранения и далее не изменяется, поэтому
реестр редиректов для переименованных slug в MVP не нужен. Отдельный небольшой
реестр структурных legacy aliases используется только для `/catalog`,
`/product/:slug` и `/ritual/:slug`.

### 9.3. Fallback

- Уже закэшированные страницы продолжают отдаваться при кратковременной недоступности CMS.
- Первый запрос к незакэшированной странице при недоступной CMS получает корректную service-unavailable страницу с `noindex`.
- Commerce endpoint при недоступности Strapi не принимает заказ «вслепую».
- Ошибка CMS не маскируется как 404.
- Недоступность Next.js webhook не блокирует редактора; storefront временно
  использует старый кэш до следующего успешного webhook или TTL refresh.

## 10. Контентная модель Strapi

### 10.1. Single types

`global-setting`:

- brand;
- navigation labels;
- contacts;
- legal details — изменяет только Admin;
- commerce settings;
- default SEO;
- default product story.

`home-page`:

- SEO;
- hero;
- текстовый about без media-поля;
- nabory preview settings;
- tovary preview settings;
- две упорядоченные relations `featuredNabory` и `featuredTovary`.

`products-page`:

- SEO;
- title, eyebrow и простой многострочный intro;
- empty-state тексты;
- media-поля отсутствуют.

### 10.2. Collection types

`product`:

- поля из продуктовой спецификации;
- `documentId` используется как внутренний стабильный ID;
- `title` — техническое название, `displayName` — отображаемое;
- уникальный неизменяемый `slug` строится из транслитерации `displayName`, а
  коллизии получают последовательные суффиксы `-2`, `-3`, ...;
- enum `type: nabor | tovar`;
- цена — обязательный integer в рублях, `> 0`;
- валюта — ISO 4217;
- `stock` — integer `≥ 0`, доступность вычисляется как `stock > 0`;
- Draft & Publish — единственный переключатель публичной видимости;
- `packageLabel` хранит единую строку типа упаковки и фасовки;
- `active`, `sortOrder` и priority-поля отсутствуют.

`order`:

- закрыт от Public role;
- создаётся только доверенным server-to-server запросом;
- при создании содержит server-owned line snapshots; дальнейшее изменение
  адреса, состава и manager comment возможно только через узкую транзакционную
  команду `order-admin` с пересчётом сумм и stock;
- хранит бизнес-статус в `orderStatus`, поскольку `status` зарезервирован
  Strapi Document Service для draft/published;
- status изменяется по разрешённым переходам;
- технические external IDs не редактируются контент-редактором.

### 10.3. Components

- `shared.seo`;
- `shared.image-with-alt`;
- `shared.link`;
- `home.hero`;
- `home.editorial-section`;
- `home.catalog-preview`;
- `product.gallery-image`;
- `commerce.order-line`;
- `commerce.customer`;

`HomePage`, `ProductsPage` и `Product` используют один опциональный
`shared.seo`; отдельные `seoTitle`, `seoDescription` и `seoImage` запрещены.
`GlobalSettings.defaultSeo` остаётся обязательным системным fallback.
`HomePage.seo` имеет приоритет над global fallback для главной.
Organization/WebSite JSON-LD получают название из `GlobalSettings.brandName`.

Главная запрашивает товары через relations `HomePage` и сохраняет их порядок.
`/tovary` использует две published-only выборки (`stock > 0` и `stock = 0`),
каждую с `title:asc`, после чего объединяет доступную группу с недоступной.

### 10.4. Lifecycle и policy

Strapi lifecycle не должен быть единственным местом критической бизнес-логики: он труднее тестируется и может сработать в неожиданных административных сценариях.

В lifecycle допустимы:

- генерация slug до создания из транслитерированного `displayName`;
- разрешение коллизий последовательными числовыми суффиксами;
- запрет ручного изменения slug после создания;
- простые derived поля;
- запрет очевидно невалидной публикации.

Создание заказа, расчёт цены и переходы статуса реализуются через custom service/controller с тестируемыми domain-функциями.

### 10.5. Seed data

- `yarn seed` идемпотентно приводит локальную Strapi к известному состоянию;
- seed и временные локальные изображения версионируются;
- данные покрывают обычные и предельные длины, отсутствующие опциональные поля, `stock = 0` и доступные товары;
- повторный запуск не создаёт дубликаты;
- дампы PostgreSQL в Git не хранятся;
- production-контент загружается отдельно и seed-командой не изменяется.

## 11. Корзина

### 11.1. Модель

```ts
type Cart = {
  version: 1;
  items: Array<{
    productId: string;
    slug: string;
    type: "ritual" | "product";
    title: string;
    packageLabel: string;
    unitPriceSnapshot: number;
    currency: "RUB";
    image: { url: string; alt: string };
    quantity: number;
  }>;
};
```

Цена в local storage используется только для отображения до серверной проверки.

### 11.2. Persist adapter

- cart store реализуется на `useSyncExternalStore`;
- persistence вынесен в отдельный тестируемый adapter к `localStorage`;
- storage key версионируется;
- JSON проверяется Zod-схемой;
- повреждённые/старые данные безопасно сбрасываются или мигрируют;
- чтение localStorage не вызывает hydration mismatch;
- запись объединяется и не происходит на каждый render;
- поддерживается событие `storage` для нескольких вкладок;
- PII в cart storage не хранится.

### 11.3. UI

Radix Dialog является основой drawer-поведения:

- focus trap;
- Escape;
- возврат focus;
- aria title/description;
- scroll lock.

Визуально Dialog оформляется как панель справа. Не полагаться только на CSS-анимацию; при `prefers-reduced-motion` движение отключается.

## 12. Commerce backend

### 12.1. Граница доверия

`POST /api/checkout/orders` является BFF endpoint и передаёт нормализованный запрос в один закрытый Strapi transaction endpoint/service. Только Strapi владеет транзакцией PostgreSQL:

1. валидирует payload;
2. проверяет rate limit по IP на reverse proxy, honeypot и минимальное время заполнения по подписанному серверному timestamp;
3. BFF вызывает закрытый Strapi endpoint с scoped server token;
4. Strapi начинает одну DB transaction и проверяет idempotency key;
5. внутри той же transaction читает и блокирует строки продуктов по стабильным ID;
6. проверяет publication/availability и `1 ≤ quantity ≤ min(5, stock)`;
7. берёт цены только из заблокированных серверных записей;
8. атомарно списывает остаток, создаёт исходный server-owned order snapshot и
   сохраняет заказ;
9. фиксирует transaction и возвращает подтверждение заказа-заявки.

Публичный результат содержит внутренний `orderId` для системной
идемпотентности и отдельный `orderNumber` для покупателя. Новые `orderNumber`
имеют формат `ГГММ-NNNN`, где четырёхзначная последовательность начинается
заново каждый месяц. Выдача защищена PostgreSQL advisory lock на месячный
префикс. Старые номера остаются читаемыми без обязательной миграции.

Next.js не выполняет отдельное предварительное списание stock или создание заказа. Ошибка до commit откатывает и order, и stock.

Корзина не резервирует stock. Переход заказа в `cancelled` один раз возвращает списанное количество; операция защищена от повторного применения.
После первого успешного создания CMS отправляет одно SMTP-уведомление на
служебный `orderNotificationEmail`; ошибка транспорта не откатывает заказ и не
попадает в публичный ответ.

### 12.2. Идемпотентность

- Клиент генерирует UUID на попытку оформления.
- Сервер хранит idempotency key с созданным order ID.
- Повтор с тем же ключом и payload возвращает предыдущий результат.
- Повтор с тем же ключом и другим payload отклоняется.
- Защита должна работать между процессами; in-memory Map недостаточен.

В простом deploy ключ можно хранить в PostgreSQL/Strapi с unique index. При большой нагрузке — Redis, но для MVP он не обязателен.

### 12.3. Деньги

- цена хранится как целое число рублей;
- валюта фиксируется в каждой строке и заказе;
- итог вычисляет сервер;
- frontend форматирует через `Intl.NumberFormat`;
- float для цен запрещён.

### 12.4. Состояния заказа

Переходы задаются state machine/domain policy, а не произвольной строкой:

```text
new ─► confirmed ─► completed
 │         │
 └─────────┴────────────► cancelled
```

Онлайн-оплата в MVP отсутствует.

## 13. Интеграции

### 13.1. Граница MVP

MVP не интегрируется со службой доставки и платёжным провайдером. Checkout
принимает единый адрес, показывает только стоимость товаров и сообщает, что
доставку и оплату подтвердит менеджер.

Будущие delivery/payment adapters добавляются отдельными ADR и не усложняют текущий order contract заранее.

### 13.2. Будущая доставка

Интеграция доставки не входит в MVP. При последующем подключении SDK/API
вызывается только сервером, а адрес сохраняется snapshot.

### 13.3. Будущая оплата

Payment adapter и webhook route не создаются до отдельного продуктового решения о способе оплаты и провайдере.

## 14. SEO-архитектура

### 14.1. Metadata

- root metadata defaults из `global-setting`;
- `generateMetadata` на `/tovary` и routes товаров/наборов;
- canonical формируется одним helper из нормализованного base URL;
- title/description имеют fallback;
- share image преобразуется CMS media mapper;
- недоступная CMS не приводит к индексируемой пустой странице.

### 14.2. Sitemap и robots

Strapi sitemap plugin:

- хранит base URL, коллекции и статические URL в собственных настройках Strapi;
- при первом запуске получает безопасную конфигурацию `/`, `/tovary` и
  `product` с шаблоном `/[type]y/[slug]`;
- включает только опубликованные товары и наборы, добавляет `lastmod` из
  `updatedAt`;
- публичный `/sitemap.xml` через runtime middleware rewrite проксируется на
  `/api/strapi-5-sitemap-plugin/sitemap.xml` внутри CMS;
- rewrite выполняется до file-path guard и не раскрывает внутренний CMS URL;
- plugin endpoint получает только публичное read-разрешение `getSitemap`;
- изменения sitemap не требуют Next.js cache revalidation.

`robots.txt`:

- содержимое редактируется без публикационного workflow в Strapi single-type
  `robots.txt`;
- динамический Next.js route запрашивает только поле `content` и отдаёт его как
  `text/plain` без кэширования;
- пустой или некорректный документ и недоступность CMS приводят к безопасному
  fallback `User-agent: *` + `Disallow: /`;
- Nginx не подменяет route статическим ответом;
- до публичного запуска запрет дублируется глобальным
  `X-Robots-Tag: noindex, nofollow, noarchive` на публичном домене.

Для `/legal/*.pdf` Nginx добавляет `X-Robots-Tag: noindex`; ссылки на документы остаются доступными пользователям.

### 14.3. JSON-LD

Серверный компонент `JsonLd` экранирует `<` при сериализации.

- главная: `Organization` как сущность бренда/сайта без предположения о юридическом статусе продавца, `WebSite`;
- каталог: `CollectionPage`, при необходимости `ItemList`;
- товар: `Product`, `Offer`, `BreadcrumbList`;
- schema price/availability формируется из тех же server DTO, что видимый UI;
- фиктивные ratings/reviews запрещены.

### 14.4. URL canonicalization

- один host и protocol;
- единая политика trailing slash;
- lowercase slug;
- один `301` без redirect chain;
- hash-секции не создают отдельные canonical;
- middleware удаляет пустые query-параметры и сохраняет непустые;
- `/catalog`, `/product/:slug` и `/ritual/:slug` считаются структурными legacy
  aliases;
- media, PDF, Next assets, API и внутренний `503` route не канонизируются;
- единственный CMS-запрос из middleware — короткий
  `/api/health/readiness` с коротким timeout и `cache: no-store`, чтобы падение
  или восстановление БД не скрывалось кешем; content-запросы и проверка
  существования slug выполняются только в server data layer.

## 15. Изображения и rich content

### 15.1. Media

- `next/image`;
- Strapi remote pattern ограничен известным host/path;
- width/height приходят из CMS для предотвращения CLS;
- responsive `sizes` задаётся по реальной сетке;
- hero получает `priority` только если действительно LCP;
- изображения ниже fold lazy по умолчанию;
- alt обязателен для содержательных media fields;
- focal point реализуется отдельным компонентом/полем;
- upload изображений ограничен `12MB`; рекомендации размеров находятся в description конкретного media field;
- alt хранится рядом с конкретным использованием media.

Для production используется RustFS отдельным сервисом на том же VPS. Версия image фиксируется, автоматические обновления запрещены. Данные находятся на persistent volume и включаются в локальный backup на отдельный persistent path того же VPS. Локальный upload volume Strapi допустим только в development.

Strapi Admin CSP явно разрешает `img-src` и `media-src` с origin,
вычисленного из `MEDIA_PUBLIC_URL`; bucket при этом сохраняет только публичный
read-only `GetObject`, без listing и write-доступа.

Storefront не должен загружать оригинал для компактного слота, если Strapi уже
создал responsive formats. Все контентные изображения получают нативные
`srcset` и `sizes`: браузер выбирает формат по ширине слота, viewport и device
pixel ratio. Listing и preview-карточки используют `small` как базовый `src`;
товарная галерея — `large` для основного изображения и `thumbnail` для ленты.
При отсутствии производных форматов остаётся исходный `src` без искусственного
`srcset`.

### 15.2. Rich content

`Product.articles` — опциональный упорядоченный repeatable-компонент. Каждый
элемент содержит обязательное поле `content` — JSON custom field плагина Better
Blocks, совместимое со структурой Strapi Blocks. Это позволяет
добавлять на страницу товара несколько самостоятельных статей и менять их
порядок в Strapi. Заголовки остаются частью Blocks, чтобы редактор не вводил один
и тот же заголовок в двух полях.

Одиночное поле `articleContent` было заменено до появления production-данных.
Канонический локальный контент перенесён в `articles[]` через повторяемый seed,
поэтому отдельная production database migration для этого перехода не нужна.

Используется Better Blocks без публикационных ошибок за структуру. Редактор
добавляет к изображениям `imageAlign: left | center | right`; storefront
на desktop заменяет боковое выравнивание на ограниченный по ширине float с
обтеканием текстом, изолированным внутри статьи. На телефонах float отключается,
и изображение выводится на всю ширину контентной зоны. Renderer:

- не рендерит raw HTML по умолчанию;
- нормализует внешние ссылки;
- рендерит content `h1` как `h2`;
- отбрасывает пустые блоки;
- требует alt;
- нормализует таблицы в семантические `table/th/td` и ограничивает их прокрутку
  локальным контейнером;
- покрыт fixture-тестами.

## 16. Безопасность

### 16.1. Secrets

Полная матрица переменных, правила хранения и процедура расширения allowlist
зафиксированы в [`runtime-configuration-spec.md`](runtime-configuration-spec.md).

- Strapi token, webhook secret и DB password — server-only;
- env валидируется при старте;
- storefront публикует runtime-конфигурацию через динамический
  `/runtime-config.js` с `no-store`; скрипт выполняется до клиентского bundle и
  задаёт `window.__APP_CONFIG__`;
- allowlist browser runtime config содержит только `SITE_URL`,
  `NEXT_PUBLIC_CMS_URL` и `NEXT_PUBLIC_MEDIA_URL`; значения обязаны быть
  абсолютными `http(s)` URL без credentials;
- `CMS_INTERNAL_URL` остаётся server-only как деталь внутренней топологии;
- `CHECKOUT_FORM_SECRET`, `STRAPI_ORDER_TOKEN`,
  `CACHE_REVALIDATION_SECRET`, Strapi secrets, DB и S3 credentials никогда не
  сериализуются в browser runtime config;
- server components читают публичные URL из env запущенного контейнера через
  тот же типизированный контракт, поэтому один Docker image не требует rebuild
  между окружениями;
- секреты не попадают в Docker image, git или browser runtime config.

### 16.2. Public endpoints

- Zod validation;
- ограничение размера body;
- rate limit публичного order endpoint реализуется на reverse proxy с корректной настройкой trusted client IP;
- приложение проверяет honeypot и минимальное время заполнения по подписанному серверному timestamp;
- CAPTCHA/Turnstile в MVP не используются и добавляются только при фактическом abuse;
- generic error клиенту, structured error серверу;
- PII не пишется в application logs;
- CORS не открывается без необходимости;
- CSRF оценивается по выбранной cookie/auth модели; публичный JSON order endpoint не считает SameSite полной защитой.

### 16.3. Strapi

- Strapi Admin на `admin.{domain}` по HTTPS;
- rate limit на login;
- least-privilege roles;
- Public role не видит orders;
- API tokens имеют минимальные scope;
- media types/size ограничены;
- регулярные обновления security patches;
- ежедневный backup БД и media с хранением только последней копии;
- документированная ручная команда восстановления.

### 16.4. Headers

- CSP;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- HSTS на production;
- frame policy для storefront и отдельное решение для Strapi admin.

## 17. Доступность

- WCAG 2.2 AA как acceptance target;
- Radix решает механику focus, но не освобождает от проверки разметки и контраста;
- системная палитра соответствует WCAG 2.2 AA;
- произвольные пары Hero и «О проекте» не валидируются и являются редакторским исключением;
- все действия доступны с клавиатуры;
- carousel не перехватывает вертикальную прокрутку;
- drawer и checkout объявляют изменения через live region;
- ошибки формы имеют summary и field association;
- touch targets не меньше 44×44 CSS px;
- motion учитывает `prefers-reduced-motion`;
- E2E включает keyboard-only happy path.

## 18. Производительность

Budgets:

| Метрика           | Цель                                                |
| ----------------- | --------------------------------------------------- |
| LCP p75 mobile    | ≤ 2,5 с                                             |
| INP p75           | ≤ 200 мс                                            |
| CLS p75           | ≤ 0,1                                               |
| Initial client JS | ≤ 180 KiB encoded; baseline прототипа 152 019 bytes |
| Fonts             | ≤ 300 KiB                                           |
| Hero image        | ≤ 350 KiB desktop / ≤ 220 KiB mobile                |
| Card image        | ≤ 160 KiB                                           |

LCP и CLS дополнительно имеют synthetic regression gate на production build
для mobile и desktop. INP остаётся production RUM-метрикой: единичное
синтетическое взаимодействие не заменяет p75 реальных пользователей. Вес
шрифтов и initial client JS проверяется детерминированно в Playwright по
`encodedBodySize`; бюджеты изображений применяются к финальному production
контенту.

Меры:

- RSC-first;
- параллельные CMS queries;
- отсутствие React Query на статическом контенте;
- прямые imports, без тяжёлых barrel exports;
- lazy load checkout UI до открытия;
- минимальные client DTO;
- локальные subset fonts;
- checkout form загружается отдельным client chunk только после перехода к
  оформлению;
- `content-visibility` только после измерений и без вреда якорной навигации;
- bundle analyzer в CI по требованию, а не production dependency.

## 19. Наблюдаемость

### 19.1. Логи

Структурированные server logs:

- request/correlation ID;
- route;
- duration;
- dependency name;
- error kind/status;
- order ID после создания;
- без телефона, email, адреса и содержимого комментария.

### 19.2. Ошибки и health

- локальные structured logs web и CMS;
- Nginx access/error logs;
- health endpoints и Docker healthchecks;
- post-deploy smoke-check;
- checkout, order creation и webhook failures имеют отдельные error kind/status.

Внешний monitoring-провайдер в MVP не подключается.

## 20. Тестовая стратегия

### 20.0. Обязательный процесс

Разработка ведётся по specification-driven development и TDD:

1. До реализации требование и acceptance criteria фиксируются в соответствующей
   спецификации. Для локального технического решения достаточно ADR, если оно не
   меняет продуктовый или визуальный контракт.
2. Рабочий цикл изменения — `red → green → refactor`: сначала падающий тест,
   затем минимальная реализация, затем рефакторинг на зелёной suite.
3. Исправление дефекта начинается с regression-теста, воспроизводящего дефект.
4. В MR описание и сценарий проверки ссылаются на затронутый контракт.

Исследовательский spike может временно обходиться без TDD, но его код не
мерджится в `main`: решение либо удаляется, либо переписывается через обычный
цикл `red → green → refactor`.

### 20.1. Unit

- money calculations;
- cart reducer/migrations;
- order state transitions;
- DTO mappers;
- canonical URL;
- metadata fallbacks;
- Zod contracts;
- webhook signature helpers;
- revalidation event routing.

### 20.2. Integration

- Strapi custom order service;
- duplicate idempotency key;
- unavailable/unpublished product;
- changed price;
- CMS unavailable behavior.

### 20.3. E2E

- главная → ритуал → корзина → заказ;
- сорт → изменение количества → заказ;
- сохранение корзины после reload;
- price changed;
- товар снят с продажи;
- остаток меньше количества в корзине;
- double submit;
- keyboard-only;
- mobile swipe/drawer;
- axe scans ключевых страниц;
- metadata/canonical/JSON-LD assertions;
- 404 и service unavailable.

Не тестировать критический checkout только через mocked browser state. Обязательный
MR/release job `integration:commerce` сначала проверяет транзакционный order
service на реальном PostgreSQL container, затем поднимает настоящий Strapi и
Next BFF и выполняет HTTP-сценарий без mocked upstream. Сценарий создаёт заказ,
повторяет запрос с тем же idempotency key, проверяет сохранённую запись и
изменение stock непосредственно в PostgreSQL, а также отказ при нулевом остатке.

## 21. CI/CD

### 21.1. Merge request pipeline

Ветка `main` защищена: прямые push запрещены, изменения попадают только через merge request. Обязательный approval не требуется, merge разрешён только при успешном pipeline.

Merge request запускает полный проверочный pipeline:

1. install с immutable lockfile;
2. format check;
3. lint;
4. typecheck;
5. unit tests;
6. PostgreSQL harness и полный HTTP order flow в `integration:commerce`;
7. Strapi schema/build;
8. Next.js production build;
9. Playwright smoke/a11y;
10. сборка web/CMS images;
11. container smoke;
12. container vulnerability scan — когда будет подключён.

После merge ветка `main` повторяет только быстрые проверки итогового
merge-коммита: format, lint, typecheck, unit и production build. E2E, сборка
images, PostgreSQL integration и container smoke здесь не повторяются.

Protected-тег `release-{semver}` запускает полный pipeline заново, публикует
images tagged commit и только после всех зелёных проверок допускает deploy.
Обычные теги pipeline не создают. Scheduled pipeline с `TLS_RENEWAL=true`
запускает только renewal job.

### 21.2. Deploy

- immutable images по commit SHA;
- GitLab CI публикует проверенные images в GitLab Container Registry;
- merge в `main` запускает проверки, но не deploy;
- production автоматически разворачивается только pipeline protected-тега формата `release-{semver}`, например `release-1.0.0`, указывающего на коммит в `main`;
- шаблон `release-*` может создавать только Maintainer; pipeline валидирует SemVer и наличие tagged commit в `main`, остальные теги deploy не запускают;
- отдельного staging нет;
- deploy job зависит от успешного завершения всех lint, typecheck, test, build, container smoke/a11y jobs и публикации images;
- дополнительный backup PostgreSQL и RustFS перед production-deploy;
- health/readiness checks;
- автоматический deploy допускает только backward-compatible schema changes;
- удаление, переименование или смена типа поля требуют отдельного migration script, backup и явного подтверждения в release MR;
- frontend deploy после совместимого CMS;
- при failure production healthcheck pipeline возвращает предыдущие web/CMS images и повторяет healthcheck;
- PostgreSQL, schema и данные автоматически не откатываются; schema changes должны быть backward-compatible, для ручного восстановления используется pre-deploy backup;
- smoke checks после deploy.

VPS только авторизуется в GitLab Container Registry, скачивает готовые images по commit SHA и обновляет Compose. Сборка из исходников на production не выполняется.
Release job подключается по SSH отдельным непривилегированным пользователем `deploy`; приватный ключ хранится в protected file variable GitLab. Пользователь получает только необходимые права на каталог Compose и Docker deploy-команды. GitLab Runner на production VPS не устанавливается.

## 22. Deployment topology

Минимальный production размещается на одном VPS в Docker Compose:

```text
Nginx / TLS
├── brega.example       → web:3000
├── admin.brega.example → cms:1337 (admin/API, restricted)
└── media.brega.example → RustFS storefront bucket (public read-only)

Private network
├── web
├── cms
├── postgres
└── RustFS media storage
```

Web может обращаться к CMS по private network URL. Browser media URL использует стабильный `media.{domain}`. Nginx публикует только read-only объекты storefront bucket; RustFS Console и административный API доступны только в private Docker network.

При одном web instance локальный Next.js cache допустим. При горизонтальном масштабировании потребуется shared cache/tag coordination или platform-native механизм; это не нужно вводить в MVP заранее.

Certbot запускается отдельным Compose-сервисом. Сертификаты и ACME challenge находятся на persistent volumes, renewal выполняется автоматически, после успешного обновления Nginx получает graceful reload.

Владелец проекта оплачивает и контролирует домен, VPS и связанные аккаунты, а также сохраняет независимый доступ. Разработка настраивает автоматический TLS, предоставляет DNS-инструкции, автоматизирует backup и документирует проверяемую процедуру восстановления.

Backup PostgreSQL и RustFS в MVP хранится на отдельном persistent path того же VPS. Копия создаётся раз в сутки, сохраняется только последняя; новая копия перед production-deploy заменяет предыдущую. В репозитории хранится документированная ручная команда восстановления. Регулярные restore-drills и недельные архивы не требуются. Такой backup даёт одну последнюю точку восстановления, но не защищает от потери VPS или физического диска. Off-site копирование является будущим инфраструктурным улучшением.

## 23. Architecture Decision Records

До реализации создать ADR:

1. `ADR-001-monorepo-and-package-boundaries`;
2. `ADR-002-next-rendering-and-cache`;
3. `ADR-003-order-stock-and-cart`;
4. `ADR-004-production-media-and-deploy`.

## 24. Рекомендуемый старт реализации

1. Скопировать организационные решения `metal-constructions`, но создать чистый monorepo Brega Chai.
2. Использовать зафиксированные Node 22, Yarn 4.14.1, Next.js 15.5.21 и Strapi 5.45.0; точные версии остальных зависимостей закрепить lockfile.
3. Поднять `web + cms + postgres + rustfs` в Docker Compose.
4. Создать contracts и Strapi content types без commerce-интеграций.
5. Реализовать CMS client, mappers, cache tags и webhook revalidation.
6. Собрать статический storefront и SEO.
7. Добавить локальную корзину.
8. Реализовать заказ-заявку и атомарное изменение stock без delivery/payment adapters.
9. Закрыть E2E, accessibility, performance и deploy.

## 25. Итоговая оценка стека

**Вердикт: подходит, с корректировками.**

Оставляем:

- Next.js App Router;
- Strapi 5;
- PostgreSQL;
- Radix;
- Yarn workspaces/Turbo;
- Docker;
- SEO-подходы и тестовую основу `metal-constructions`.

Меняем архитектурный акцент:

- cache-first вместо глобального SSR на каждый запрос;
- RSC вместо React Query для публичного контента;
- Radix Primitives + собственная дизайн-система вместо зависимости от стандартного вида Themes;
- Next.js как BFF для commerce;
- отдельные contracts/domain services для заказа;
- webhook-driven tag revalidation;
- серверная перепроверка цены и идемпотентное создание заказа.

Такой вариант остаётся небольшим для MVP, но не создаёт тупиков при подключении
доставки, оплаты и дальнейшей смене товарной категории.
