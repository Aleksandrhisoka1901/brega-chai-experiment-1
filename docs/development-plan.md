# Brega Chai — план разработки

Статус: актуализирован после завершения основного storefront и commerce flow.
Источники требований: `product-spec.md`, `design-spec.md` и
`architecture-spec.md`.

## Правила выполнения

- Каждый срез начинается с требования и измеримых acceptance criteria.
- Реализация следует циклу `red → green → refactor`.
- Исправление дефекта начинается с regression-теста.
- Один merge request закрывает один проверяемый вертикальный срез.
- Срез завершается только после необходимых unit, integration, E2E и
  accessibility-проверок.
- Исследовательский spike не попадает в `main` без переписывания через обычный
  TDD-цикл.

## Текущее состояние

### Базовая платформа — готово

- monorepo: Next.js, Strapi, contracts;
- локальный Docker Compose: web, CMS, PostgreSQL, RustFS;
- локальный seed и публичные read-only CMS permissions;
- RustFS/S3 provider и технический лимит веса файлов;
- production images, Nginx, security headers, healthchecks;
- GitLab pipeline и deploy только по protected-тегу `release-{semver}`;
- backup/restore scripts и rollback application images;
- дизайн-система, showcase и Lucide icons.

### Content MVP — код готов

- CMS client, строгие Zod mappers и controlled unavailable states;
- CMS-driven главная: hero, «О проекте», «Ритуалы», «Сорта»;
- конечная карусель без autoplay;
- каталог `/products`;
- карточка товара и `/products/[slug]`;
- вертикальные thumbnails на desktop и горизонтальные на mobile;
- keyboard gallery, quantity, availability и 404;
- CMS-driven header/footer и navigation labels;
- локальные Cormorant Garamond и Manrope;
- metadata, canonical, sitemap, robots;
- Organization, WebSite, Product, Offer и Breadcrumb JSON-LD;
- route/global errors с `noindex`;
- CMS-driven intro `/products`;
- безопасный Strapi Blocks renderer для intro и статьи товара;
- H1 из rich content рендерится как H2;
- подписанный webhook Strapi → Next.js для точечной revalidation;
- axe и E2E основных страниц.

Осталось:

- загрузить реальные юридические PDF и включить ссылки;
- провести итоговую visual QA с production-контентом.

### Commerce MVP — готов основной сценарий

- cart domain и versioned `localStorage`;
- Radix cart drawer;
- quantity `1–min(5, stock)`;
- changed/insufficient/unavailable stock states;
- checkout внутри drawer;
- телефон через `libphonenumber-js`;
- draft в `sessionStorage` без согласий;
- signed form token, honeypot и minimum fill time;
- Next.js BFF со scoped Strapi token;
- timeout и безопасные ответы без PII;
- строгий shared order contract без клиентской цены;
- серверный пересчёт integer RUB;
- PostgreSQL transaction, row locks и idempotency;
- атомарное списание stock;
- допустимые переходы заказа и однократный возврат stock при отмене;
- изменение статуса из Strapi Content Manager только через транзакционный
  `transitionStatus`;
- PostgreSQL integration harness;
- browser flow через настоящий Next BFF с mocked Strapi upstream;
- scoped Strapi API token с единственным permission
  `api::order.order.create`;
- локальный и обязательный CI flow Next BFF → настоящий Strapi → PostgreSQL;
- проверка success, insufficient stock, double submit, rollback и фактического
  изменения stock.

## Ближайшие срезы

### 1. Order status lifecycle

Статус: готово.

- зафиксировать поведение изменения статуса из Strapi Admin;
- направлять переходы только через `transitionStatus`;
- запретить обход через прямой Content Manager update;
- проверить `new → confirmed → completed`;
- проверить `new/confirmed → cancelled`;
- доказать повторное отсутствие возврата stock.

Критерий завершения выполнен: проверка через реальный локальный Strapi Content
Manager подтвердила `new → confirmed → cancelled`, изменение stock и отсутствие
повторного возврата.

### 2. Cache revalidation

Статус: готово.

- отправлять из Strapi `publish`, `update` и `unpublish` для storefront-контента;
  сохранение draft не должно отправлять событие;
- подписывать точное JSON-тело через HMAC-SHA256 и проверять подпись до разбора
  payload;
- строго проверять allowlisted envelope и ограничение размера body; cache
  tags/paths определять только серверной матрицей;
- дедуплицировать одинаковые события в bounded in-memory registry и отклонять
  повтор ID с другим payload;
- использовать короткий timeout и fail-safe обработку недоступности Next.js,
  не откатывая публикацию в Strapi;
- покрыть контракт и матрицу invalidation unit/integration-тестами.

Acceptance criteria:

1. Валидные события сбрасывают ровно tags/paths из architecture-spec; draft,
   неизвестный event и переданные клиентом cache keys ничего не сбрасывают.
2. Неверная подпись, изменённое тело, oversized body и malformed envelope
   получают безопасный отказ без invalidation.
3. Одинаковое событие даёт один логический эффект; повтор ID с другим payload
   отклоняется.
4. Недоступность Next.js не отменяет публикацию в Strapi; плановый TTL остаётся
   страховкой для eventual refresh.
5. Локальная проверка с реальными Strapi и Next.js подтверждает обновление
   опубликованной страницы без deploy.

Критерии выполнены: повторная публикация существующего товара через локальный
Strapi Content Manager доставляет подписанное событие в Next.js и получает
успешный ответ `/api/revalidate`; unit-тесты покрывают контракт, routing,
дедупликацию, неверную подпись, oversized payload и outage.

### 3. ProductsPage и rich content

Статус: готово.

- перенести intro каталога в `ProductsPage`;
- добавить Blocks renderer с разрешёнными frontend-компонентами;
- заменять H1 из rich content на H2;
- экранировать/исключать исполняемый контент;
- добавить редакторские descriptions в Strapi;
- проверить длинные и короткие анонсы.

Критерий завершения: редактор меняет контент без правки frontend, а axe и
sanitization tests остаются зелёными.

Критерии выполнены: `/products` получает title, Blocks intro, SEO и опциональное
изображение из `ProductsPage`; статья товара использует общий allowlisted
renderer. Пустые, неизвестные и исполняемые nodes отбрасываются, небезопасные
ссылки становятся обычным текстом, а CMS H1 нормализуется в H2. Fixture-тесты
покрывают rich content, короткие и длинные анонсы и отсутствие изображения.

### 4. Real commerce integration

Статус: готово.

- scoped token создаётся повторяемой local/test командой и ограничен только
  созданием заказа;
- `integration:commerce` запускает PostgreSQL harness, настоящий Strapi и Next
  BFF без mocked upstream;
- HTTP-сценарий проверяет success, insufficient stock, double submit,
  сохранённый заказ и фактическое списание stock;
- rollback и конкурентная идемпотентность остаются покрыты прямым PostgreSQL
  harness.

Критерий завершения: минимум один обязательный CI-сценарий создаёт реальный
заказ через Next BFF и Strapi и проверяет фактическое изменение stock в
PostgreSQL. Критерий выполнен.

## Hardening и выпуск

### Качество

- visual QA: desktop, tablet и mobile;
- responsive image audit;
- performance budgets и Web Vitals;
- полная keyboard-only проверка;
- axe ключевых страниц и drawer states;
- проверка reduced motion;
- cross-browser smoke при необходимости.

### Безопасность

- dependency и container vulnerability scan;
- rich-content sanitization review;
- API token scope review;
- проверка Nginx rate limits для checkout и admin login;
- проверка CSP/security headers на production topology;
- отсутствие PII в логах и ошибках.

### Эксплуатация

- backup/restore rehearsal PostgreSQL и RustFS;
- deploy/rollback rehearsal;
- health/readiness и log review;
- production runbook;
- release checklist.

### Контент и внешний контур

- финальный текст и изображения;
- юридические PDF;
- production VPS и DNS;
- TLS для основного и `admin.*` доменов;
- protected CI variables и Registry access;
- первый production-тег `release-{semver}`.

## Текущие обязательные проверки

- lint, typecheck и production build всех packages;
- unit: web, CMS и contracts;
- PostgreSQL order integration harness;
- Playwright production-build suite;
- axe на главной, каталоге, товаре, корзине и checkout;
- `git diff --check`.

## Следующие merge requests

1. `cache-revalidation`;
2. `cms-content-rendering`;
3. `real-order-integration`;
4. `release-hardening`;
5. `production-content`;
6. `release-{semver}` после появления VPS.
