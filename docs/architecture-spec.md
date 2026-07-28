# Brega Chai — техническая архитектурная спецификация

Статус: черновик для технического согласования

Связанный документ: [продуктовая спецификация](./product-spec.md)

Референсная кодовая база: `~/Projects/external-projects/metal-constructions`
Дата: 27 июля 2026

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
- `robots.ts`, `sitemap.ts`, JSON-LD;
- локальные шрифты через `next/font`;
- Playwright + axe;
- ESLint, Prettier, typecheck и CI gates;
- Zod для входных данных публичных endpoint;
- rate limiting для публичных форм/заказов.

### 2.2. Адаптируем

| В `metal-constructions` | В Brega Chai |
| --- | --- |
| `packages/web`, `packages/admin`, `packages/lib` | `apps/web`, `apps/cms`, `packages/contracts`, опционально `packages/ui` |
| React Query гидратируется в публичный контент | Публичный контент читается в React Server Components; React Query не нужен по умолчанию |
| Root layout `force-dynamic` | Статический/cache-first layout с tag-based revalidation |
| Общая библиотека содержит UI и формы | Shared package хранит прежде всего схемы, DTO и чистые domain-функции |
| Strapi sitemap plugin | Sitemap генерирует Next.js из опубликованных продуктов |
| Lead endpoint | Order endpoint с повторной проверкой цен, идемпотентностью и адаптерами доставки/оплаты |
| Privacy как HTML-страница | Юридические PDF в `public/legal` либо объектном хранилище |
| Radix Themes задаёт большую часть оформления | Radix используется для поведения; editorial visual language задают CSS tokens и собственные компоненты |

### 2.3. Не переносим

- глобальный `force-dynamic`;
- обязательный TanStack Query для CMS-контента;
- дублирование одних DTO вручную в нескольких пакетах;
- generic CRUD-методы CMS client в публичном client bundle;
- прямое создание заказа через публичный Strapi CRUD;
- хранение цены заказа только как ссылки на текущий товар;
- module-level mutable state для rate limiting в production;
- зависимость SEO от стороннего Strapi sitemap plugin;
- React Toastify, если достаточно локального accessible live region.

## 3. Целевой стек

Версии фиксируются при инициализации проекта после проверки совместимости. Не использовать плавающий `latest`.

| Слой | Выбор | Назначение |
| --- | --- | --- |
| Runtime | Node.js 22 LTS, если поддерживается выбранными версиями | единый runtime web/CMS/tooling |
| Package manager | Yarn 4 | workspaces, lockfile |
| Orchestration | Turborepo | dev/build/test/typecheck pipelines |
| Frontend | Next.js App Router + React + TypeScript | storefront и BFF |
| UI behavior | Radix Primitives; Radix Themes выборочно | dialog/drawer, accessible primitives |
| Icons | `lucide-react` | единый tree-shakeable набор интерфейсных SVG-иконок |
| Styling | CSS Modules + global design tokens | кастомная журнальная стилистика |
| CMS | Strapi 5 | товары, страницы, SEO, заказы |
| Database | PostgreSQL 16+ | Strapi content и orders |
| Validation | Zod | формы, API payload, env |
| Forms | React Hook Form + Zod resolver | checkout |
| Phone | libphonenumber-js | parse и E.164 normalization |
| Cart state | небольшой внешний store с persisted adapter либо `useSyncExternalStore` | клиентская корзина |
| Rich content | стандартный Strapi Blocks | статьи товара |
| E2E | Playwright + axe-core | критические сценарии |
| Unit tests | Node test runner или Vitest | domain и mapper tests |
| Containers | Docker Compose local; отдельные production images | воспроизводимый deploy |

### 3.1. Radix: Primitives или Themes

Рекомендация — Radix Primitives как обязательная база и Radix Themes только там, где его tokens/компоненты не мешают арт-дирекшену.

Причина: Brega Chai требует нестандартной журнальной пластики. Полная зависимость от стандартных Theme-компонентов ускоряет прототип, но повышает риск получить визуально типовой интерфейс. Drawer, Dialog, VisuallyHidden, Accessible Icon и базовое управление focus стоит взять у Radix; карточки, типографику, секции, кнопки и сетки — оформить собственными компонентами.

## 4. Контекстная схема

```text
┌────────────┐       HTTPS        ┌─────────────────────┐
│ Покупатель │ ─────────────────► │ Next.js storefront  │
└────────────┘                     │ RSC + BFF endpoints │
                                   └───────┬──────┬──────┘
                                           │      │
                             server-only   │      │ adapters
                                           ▼      ▼
                                   ┌──────────┐  ┌──────────────┐
                                   │ Strapi 5 │  │ СДЭК / оплата│
                                   └────┬─────┘  └──────────────┘
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
│   │   │   │   ├── delivery/
│   │   │   │   └── security/
│   │   │   ├── lib/
│   │   │   │   ├── seo/
│   │   │   │   ├── money/
│   │   │   │   └── env/
│   │   │   └── styles/
│   │   ├── public/legal/
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
│   │       ├── product.ts
│   │       └── delivery.ts
│   └── ui/                  # создаётся только при реальном повторном использовании
├── docs/
├── docker-compose.yml
├── package.json
├── turbo.json
└── yarn.lock
```

Не создавать общий `utils`-пакет заранее. Код выносится в package только при наличии стабильной границы и минимум двух потребителей.

## 6. Маршруты Next.js

```text
src/app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
├── error.tsx
├── global-error.tsx
├── robots.ts
├── sitemap.ts
├── manifest.ts
├── products/
│   ├── page.tsx
│   └── [slug]/page.tsx
├── rituals/
│   └── [slug]/page.tsx
└── api/
    ├── checkout/
    │   ├── quote/route.ts
    │   └── orders/route.ts
    ├── delivery/
    │   ├── locations/route.ts
    │   └── pickup-points/route.ts
    ├── payments/
    │   └── webhook/route.ts       # если будет онлайн-оплата
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
- клиентской аналитики.

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
- Public content читается read-only token либо через строго разрешённую public role.
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
- `getSitemapProducts()`.

Не экспортировать generic `get/post/put/delete` в UI-слой.

### 8.3. Populate

- Использовать явный allowlist полей и relations.
- Не использовать бесконтрольный deep populate.
- Для listing и detail создать разные projections.
- Listing не получает gallery и article content.
- Sitemap не получает изображения/статьи, кроме реально используемых sitemap image полей.

## 9. Кэширование и публикация

### 9.1. Стратегия

Контент storefront кэшируется по смысловым tags:

- `global`;
- `home`;
- `products`;
- `product:{documentId}`;
- `product-slug:{type}:{slug}`.

Каталог и продуктовые страницы допускают stale-while-revalidate. Checkout, quote и order creation всегда `no-store`.

### 9.2. Webhook Strapi

После publish/update/unpublish Strapi вызывает:

`POST /api/revalidate`

Требования:

- HMAC или shared secret;
- allowlist событий и content types;
- постоянное время сравнения секрета;
- rate limit;
- логирование event ID без содержимого персональных данных;
- идемпотентная обработка;
- tag-based revalidation;
- revalidation sitemap при изменении публикации/slug.

Если меняется slug, инвалидируются старый и новый маршрут. Для production нужен redirect registry либо запрет изменения slug после первой публикации без явного redirect.

### 9.3. Fallback

- Уже закэшированные страницы продолжают отдаваться при кратковременной недоступности CMS.
- Первый запрос к незакэшированной странице при недоступной CMS получает корректную service-unavailable страницу с `noindex`.
- Commerce endpoint при недоступности Strapi не принимает заказ «вслепую».
- Ошибка CMS не маскируется как 404.

## 10. Контентная модель Strapi

### 10.1. Single types

`global-setting`:

- brand;
- navigation labels;
- contacts;
- legal details;
- commerce settings;
- default SEO;
- default product story.

`home-page`:

- SEO;
- hero;
- about;
- rituals preview settings;
- products preview settings.

`products-page`:

- SEO;
- intro.

### 10.2. Collection types

`product`:

- поля из продуктовой спецификации;
- `documentId` используется как внутренний стабильный ID;
- уникальный `slug`;
- enum `type`;
- цена — integer в копейках;
- валюта — ISO 4217;
- `stock` — integer `≥ 0`, доступность вычисляется как `stock > 0`;
- статусы публикации и активности разделены.

`order`:

- закрыт от Public role;
- создаётся только доверенным server-to-server запросом;
- содержит immutable line snapshots;
- status изменяется по разрешённым переходам;
- технические external IDs не редактируются контент-редактором.

`redirect` — рекомендуется:

- `fromPath`;
- `toPath`;
- status `301 | 308`;
- active.

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

### 10.4. Lifecycle и policy

Strapi lifecycle не должен быть единственным местом критической бизнес-логики: он труднее тестируется и может сработать в неожиданных административных сценариях.

В lifecycle допустимы:

- нормализация slug;
- простые derived поля;
- запрет очевидно невалидной публикации.

Создание заказа, расчёт цены и переходы статуса реализуются через custom service/controller с тестируемыми domain-функциями.

## 11. Корзина

### 11.1. Модель

```ts
type Cart = {
  version: 1;
  items: Array<{
    productId: string;
    slug: string;
    type: 'ritual' | 'product';
    title: string;
    packageLabel: string;
    unitPriceSnapshot: number;
    currency: 'RUB';
    image: { url: string; alt: string };
    quantity: number;
  }>;
};
```

Цена в local storage используется только для отображения до серверной проверки.

### 11.2. Persist adapter

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

`POST /api/checkout/orders`:

1. валидирует payload;
2. проверяет rate limit и anti-bot сигнал;
3. проверяет idempotency key;
4. получает продукты из Strapi по стабильным ID;
5. проверяет publication/availability;
6. проверяет `1 ≤ quantity ≤ min(5, stock)`;
7. берёт цены только с сервера;
8. атомарно списывает остаток и создаёт immutable order snapshot;
9. создаёт заказ через приватный Strapi endpoint;
10. возвращает подтверждение заказа-заявки;
11. отправляет уведомление асинхронно после надёжного создания.

Корзина не резервирует stock. Переход заказа в `cancelled` один раз возвращает списанное количество; операция защищена от повторного применения.

### 12.2. Идемпотентность

- Клиент генерирует UUID на попытку оформления.
- Сервер хранит idempotency key с созданным order ID.
- Повтор с тем же ключом и payload возвращает предыдущий результат.
- Повтор с тем же ключом и другим payload отклоняется.
- Защита должна работать между процессами; in-memory Map недостаточен.

В простом deploy ключ можно хранить в PostgreSQL/Strapi с unique index. При большой нагрузке — Redis, но для MVP он не обязателен.

### 12.3. Деньги

- integer minor units;
- валюта фиксируется в каждой строке и заказе;
- итог вычисляет сервер;
- округление выполняется централизованной pure-функцией;
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

MVP не интегрируется со СДЭК и платёжным провайдером. Checkout принимает единый адрес, показывает только стоимость товаров и сообщает, что доставку и оплату подтвердит менеджер.

Единственная внешняя граница MVP:

```ts
interface OrderNotifier {
  orderCreated(order: OrderSnapshot): Promise<void>;
}
```

Будущие delivery/payment adapters добавляются отдельными ADR и не усложняют текущий order contract заранее.

### 13.2. Будущая доставка

СДЭК не входит в MVP. При последующем подключении SDK/API вызывается только сервером, а адрес сохраняется snapshot.

### 13.3. Будущая оплата

Payment adapter и webhook route не создаются до отдельного решения о юридической модели и провайдере.

## 14. SEO-архитектура

### 14.1. Metadata

- root metadata defaults из `global-setting`;
- `generateMetadata` на `/products` и product routes;
- canonical формируется одним helper из нормализованного base URL;
- title/description имеют fallback;
- share image преобразуется CMS media mapper;
- недоступная CMS не приводит к индексируемой пустой странице.

### 14.2. Sitemap и robots

Next.js `sitemap.ts`:

- `/`;
- `/products`;
- все опубликованные `/products/[slug]`;
- все опубликованные `/rituals/[slug]`;
- `lastModified` из Strapi;
- опциональные product images.

`robots.ts`:

- разрешает публичные страницы;
- закрывает `/api/`;
- не публикует CMS/admin URLs;
- содержит абсолютный sitemap URL.

Юридические PDF можно индексировать либо закрыть заголовком/robots по отдельному решению.

### 14.3. JSON-LD

Серверный компонент `JsonLd` экранирует `<` при сериализации.

- главная: `Organization`, `WebSite`;
- каталог: `CollectionPage`, при необходимости `ItemList`;
- товар: `Product`, `Offer`, `BreadcrumbList`;
- schema price/availability формируется из тех же server DTO, что видимый UI;
- фиктивные ratings/reviews запрещены.

### 14.4. URL canonicalization

- один host и protocol;
- единая политика trailing slash;
- lowercase slug;
- один 301/308 без redirect chain;
- hash-секции не создают отдельные canonical;
- middleware/proxy не выполняет CMS-запросы.

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

Для production рекомендуется S3-совместимое хранилище. Локальный upload volume допустим только с backup и single-instance CMS.

### 15.2. Rich content

Используется стандартный Strapi Blocks без кастомизации toolbar и без публикационных ошибок за структуру. Renderer:

- не рендерит raw HTML по умолчанию;
- нормализует внешние ссылки;
- рендерит content `h1` как `h2`;
- отбрасывает пустые блоки;
- требует alt;
- покрыт fixture-тестами.

## 16. Безопасность

### 16.1. Secrets

- Strapi token, webhook secret и DB password — server-only;
- env валидируется при старте;
- `NEXT_PUBLIC_*` используется только для действительно публичных значений;
- секреты не попадают в Docker image, git или browser runtime config.

### 16.2. Public endpoints

- Zod validation;
- ограничение размера body;
- rate limit на shared storage либо platform primitive;
- anti-bot honeypot/turnstile по результатам abuse testing;
- generic error клиенту, structured error серверу;
- PII не пишется в application logs;
- CORS не открывается без необходимости;
- CSRF оценивается по выбранной cookie/auth модели; публичный JSON order endpoint не считает SameSite полной защитой.

### 16.3. Strapi

- admin на отдельном host/path с HTTPS;
- least-privilege roles;
- Public role не видит orders;
- API tokens имеют минимальные scope;
- media types/size ограничены;
- регулярные обновления security patches;
- backup БД и media с проверкой восстановления.

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

| Метрика | Цель |
| --- | --- |
| LCP p75 mobile | ≤ 2,5 с |
| INP p75 | ≤ 200 мс |
| CLS p75 | ≤ 0,1 |
| Initial client JS | фиксируется после прототипа; regression gate обязателен |
| Hero image | отдельный art-direction budget |

Меры:

- RSC-first;
- параллельные CMS queries;
- отсутствие React Query на статическом контенте;
- прямые imports, без тяжёлых barrel exports;
- lazy load checkout/CDEK UI до открытия;
- analytics после hydration/idle;
- минимальные client DTO;
- локальные subset fonts;
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

### 19.2. Ошибки и метрики

- error monitoring для web и CMS;
- availability CMS;
- latency/error rate checkout, CDEK и payment;
- число order creation success/failure;
- webhook failures;
- Core Web Vitals;
- health endpoints для orchestration.

Provider выбирается перед production.

## 20. Тестовая стратегия

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
- CDEK adapter contract с mock server;
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

Не тестировать критический checkout только через mocked browser state: минимум один CI-сценарий должен проходить через реальные test containers Strapi/PostgreSQL.

## 21. CI/CD

### 21.1. Merge request pipeline

1. install с immutable lockfile;
2. format check;
3. lint;
4. typecheck;
5. unit tests;
6. Strapi schema/build;
7. Next.js production build;
8. integration tests;
9. Playwright smoke/a11y на собранных containers;
10. container vulnerability scan — если доступен в GitLab.

### 21.2. Deploy

- immutable images по commit SHA;
- staging перед production;
- DB backup до schema-changing deploy;
- health/readiness checks;
- migrations и Strapi schema changes документируются;
- frontend deploy после совместимого CMS;
- rollback image не должен предполагать автоматический rollback DB;
- smoke checks после deploy.

## 22. Deployment topology

Минимальный production:

```text
Reverse proxy / TLS
├── brega.example       → web:3000
└── cms.brega.example   → cms:1337 (admin/API, restricted)

Private network
├── web
├── cms
└── postgres

External
├── object storage
├── CDEK
├── payment provider
└── monitoring
```

Web может обращаться к CMS по private network URL. Browser media URL должен быть публичным и стабильным.

При одном web instance локальный Next.js cache допустим. При горизонтальном масштабировании потребуется shared cache/tag coordination или platform-native механизм; это не нужно вводить в MVP заранее.

## 23. Architecture Decision Records

До реализации создать ADR:

1. `ADR-001-monorepo-and-package-boundaries`;
2. `ADR-002-next-rendering-and-cache`;
3. `ADR-003-strapi-content-and-order-model`;
4. `ADR-004-radix-primitives-vs-themes`;
5. `ADR-005-strapi-blocks-rendering`;
6. `ADR-006-cart-persistence`;
7. `ADR-007-order-request-model`;
8. `ADR-008-stock-transactions`;
9. `ADR-009-media-storage`;
10. `ADR-010-production-hosting`.

## 24. Решения, блокирующие финализацию архитектуры

1. Юридический статус и требования к чеку.
2. Production hosting и число экземпляров web/CMS.
3. Объектное хранилище или persistent local media.
4. Канал уведомлений о заказе.
5. Политика хранения персональных данных.

Эти вопросы не блокируют scaffold, контентную модель страниц и UI storefront. Они блокируют окончательный контракт order/payment/delivery и production topology.

## 25. Рекомендуемый старт реализации

1. Скопировать организационные решения `metal-constructions`, но создать чистый monorepo Brega Chai.
2. Зафиксировать версии Node/Yarn/Next/Strapi/Radix по compatibility matrix.
3. Поднять `web + cms + postgres` в Docker Compose.
4. Создать contracts и Strapi content types без commerce-интеграций.
5. Реализовать CMS client, mappers, cache tags и webhook revalidation.
6. Собрать статический storefront и SEO.
7. Добавить локальную корзину.
8. Реализовать заказ-заявку и атомарное изменение stock без delivery/payment adapters.
9. Закрыть E2E, accessibility, performance и deploy.

## 26. Итоговая оценка стека

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

Такой вариант остаётся небольшим для MVP, но не создаёт тупиков при подключении СДЭК, оплаты и дальнейшей смене товарной категории.
