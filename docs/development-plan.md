# Brega Tea — план разработки

Статус: функциональный MVP завершён; активны только release hardening,
production-контент и внешний release-readiness.
Источники требований: `product-spec.md`, `design-spec.md`,
`architecture-spec.md`, `checkout-update-spec.md`,
`catalog-content-unification-spec.md` и `order-admin-spec.md`.

## Правила выполнения

- Каждый срез начинается с требования и измеримых acceptance criteria.
- Реализация следует циклу `red → green → refactor`.
- Исправление дефекта начинается с regression-теста.
- Один pull request закрывает один проверяемый вертикальный срез.
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
- GitHub Actions и deploy только по защищённому тегу `release-{semver}`;
- backup/restore scripts и rollback application images;
- дизайн-система, showcase и Lucide icons.

### Content MVP — готово

- CMS client, строгие Zod mappers и controlled unavailable states;
- CMS-driven главная: hero, «О проекте», «Ритуалы», «Сорта»;
- конечная карусель без autoplay;
- каталог `/tovary`;
- карточки товара `/tovary/[slug]` и набора `/nabory/[slug]`;
- вертикальные thumbnails на desktop и горизонтальные на mobile;
- keyboard gallery, quantity, availability и 404;
- CMS-driven header/footer и navigation labels;
- локальные Cormorant Garamond и Manrope;
- metadata, canonical, sitemap, robots;
- Organization, WebSite, Product, Offer и Breadcrumb JSON-LD;
- route/global errors с `noindex`;
- CMS-driven intro `/tovary`;
- безопасный Blocks-совместимый renderer для статей товара;
- H1 из rich content рендерится как H2;
- подписанный webhook Strapi → Next.js для точечной revalidation;
- axe и E2E основных страниц.

Осталось:

- загрузить реальные юридические PDF и включить ссылки;
- провести итоговую visual QA с production-контентом.

### Commerce MVP — готово

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
  изменения stock;
- отдельный `order-admin` с list/detail, статусами и редактированием адреса,
  состава заказа и комментария менеджера.

## Завершённые функциональные срезы

### 0. Checkout, уведомления и ребрендинг по ТЗ 2

Статус: готово по `checkout-update-spec.md`.

- RED: контрактные и domain-тесты способов получения, снимков адреса/скидки и
  двух сумм;
- RED: тест формата и однократного запуска email-уведомлений;
- RED: mapper/admin DTO и checkout validation/UI expectations;
- GREEN: CMS-настройки, order transaction, уведомление и admin UI;
- GREEN: пошаговый checkout и публичное переименование в `Brega Tea`;
- REFACTOR/VERIFY: typecheck, unit, integration, E2E, axe и visual regression.

Acceptance criteria определены в `checkout-update-spec.md`.

Критерии выполнены: CMS хранит служебный email и коммерческие настройки,
checkout сохраняет серверные snapshots способа получения, адреса, скидки и двух
сумм, а первое создание заказа запускает независимые email-уведомления
администратору и покупателю без отката заказа при ошибке транспорта. Публичный
бренд заменён на `Brega Tea`, пустой media-логотип
показывает текстовый wordmark. Unit suites, typecheck, CMS build, checkout E2E,
axe, keyboard flow и Linux visual regression прошли; PostgreSQL harness остаётся
условной проверкой и запускается при наличии seeded local database.

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

- использовать Next Data Cache с резервным TTL `300s` и смысловыми tags;
- отправлять из Strapi `publish`, `update` и `unpublish` для storefront-контента;
  физическое `entry.delete` нормализовать в `unpublish`, а сохранение draft не
  должно отправлять событие;
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
дедупликацию, неверную подпись, oversized payload и outage. Strapi subscriber
подключён в application bootstrap, а `fetchCms` использует tags и TTL `300s`,
поэтому webhook даёт немедленное обновление, а TTL страхует потерянную доставку.

### 3. ProductsPage и rich content товара

Статус: готово.

- перенести простой многострочный intro каталога в `ProductsPage`;
- добавить Blocks renderer с разрешёнными frontend-компонентами;
- заменять H1 из rich content на H2;
- экранировать/исключать исполняемый контент;
- добавить редакторские descriptions в Strapi;
- проверить длинные и короткие анонсы.

Критерий завершения: редактор меняет контент без правки frontend, а axe и
sanitization tests остаются зелёными.

Критерии выполнены: `/tovary` получает title, простой многострочный intro и SEO
из `ProductsPage`; отдельного изображения у страницы каталога нет. Статьи
товара используют общий allowlisted Blocks renderer. Пустые, неизвестные и
исполняемые nodes отбрасываются, небезопасные ссылки становятся обычным текстом,
а CMS H1 нормализуется в H2. Fixture-тесты покрывают rich content и короткие и
длинные анонсы.

### 3.1. Несколько статей в нижней зоне товара

Статус: готово.

- добавить к `Product` упорядоченный repeatable-компонент `articles[]`, каждый
  элемент которого содержит обязательный Better Blocks `content`, совместимый
  с JSON-структурой Strapi Blocks;
- перенести существующий непустой `articleContent` в первый элемент массива и
  после проверенной миграции удалить устаревшее поле;
- обновить seed, detail projection, Zod mapper и серверный DTO без добавления
  статей в listing/checkout payload;
- вывести все статьи по порядку, применяя редакционный маркер к началу каждой,
  и сохранить поддержку форматирования, изображений, alt и подписей;
- добавить description для поля в Strapi с рекомендациями по структуре;
- выполнить срез по TDD: сначала contract/mapper/rendering regression tests,
  затем CMS-модель и frontend.

Acceptance criteria:

1. Редактор может добавить, удалить и переставить минимум две статьи у сорта или
   набора без изменения frontend-кода.
2. Каждая статья независимо поддерживает разрешённые Blocks-элементы и
   изображения с alt и подписью.
3. Storefront выводит опубликованные статьи в порядке CMS; пустой массив не
   оставляет пустого контейнера или лишнего отступа.
4. Существующий `articleContent` переносится без потери блоков, после чего
   отсутствует в рабочем API-контракте.
5. Mapper, renderer, sanitization, axe и detail-page E2E остаются зелёными.

Критерии выполнены: `Product.articles[]` хранит упорядоченные
Better Blocks-материалы,
detail projection и mapper возвращают только непустые нормализованные статьи,
а storefront выводит каждую отдельной редакционной секцией. Канонический
локальный контент перенесён повторяемым seed до появления production-данных;
отдельная database migration не требуется. CMS/web unit suites, typecheck,
целевой Playwright и проверка реального Strapi API зелёные.

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

### 5. UI и layout remediation

Статус: готово.

- собрать и зафиксировать замечания по каждой готовой странице и общим
  компонентам;
- проверить главную, каталог, карточку товара, корзину и checkout на desktop,
  tablet и mobile;
- отдельно проверить сетки, вертикальный ритм, ширины контейнеров, типографику,
  изображения, переполнение контента и sticky/fixed элементы;
- отдельным типографическим проходом исключить висячие короткие предлоги, союзы
  и частицы во всём пользовательском тексте, включая контент из CMS, с проверкой
  на desktop, tablet и mobile;
- сгруппировать исправления в небольшие проверяемые срезы: общая layout-система,
  storefront-страницы и commerce UI;
- для каждого дефекта сначала зафиксировать ожидаемое поведение в spec или
  visual reference, затем добавить подходящую regression-проверку;
- обновить showcase, если исправление меняет общий компонент или design token;
- после исправлений провести повторную визуальную приёмку всех целевых
  viewport.

Выполнено:

- общая логика горизонтальных gutters и адаптивных сеток;
- соответствие главной design reference, включая header, hero, разделы и footer;
- адаптив каталога и товарной галереи;
- переиспользование карточек и общих UI-компонентов;
- commerce drawer, checkout form, textarea, scrollbar и состояния ошибок;
- типографическая обработка коротких русских предлогов, союзов и частиц;
- Better Blocks для статей, изображения с alignment/float, captions и таблицы;
- функциональные responsive, keyboard, axe и reduced-motion проверки.

Финальная проверка выполнена:

- зафиксированы 13 Linux-generated visual regression snapshots для главной,
  каталога, товара, корзины и checkout на `390`, `768` и `1440px`;
- 12 visual tests повторно проходят в закреплённом CI Playwright image без
  обновления baselines;
- ручной просмотр snapshot-набора не выявил overflow, наложений или случайных
  скачков сетки;
- полный production-build functional E2E проходит: 20/20.

Acceptance criteria:

1. Все согласованные замечания имеют статус и привязку к странице, компоненту
   или общему layout-правилу.
2. Страницы соответствуют утверждённым design reference на согласованных
   viewport без горизонтального overflow, случайных скачков сетки и наложения
   интерактивных элементов.
3. Общие визуальные правила исправлены в design system, а не продублированы
   локальными обходами на страницах.
4. Для стабильных layout-инвариантов добавлены component/E2E assertions; для
   ключевых экранов сохранены согласованные visual regression snapshots.
5. Keyboard, axe и reduced-motion проверки затронутых сценариев остаются
   зелёными.
6. Итоговая ручная visual QA подтверждена до начала release hardening.

Критерии выполнены. Storefront и commerce remediation вошли в общий
`ui-layout-foundation`, стабильные responsive/layout-инварианты покрыты
functional E2E, а ключевые экраны — Linux visual baselines.

### 6. Навигация, CMS и системные состояния

Статус: реализовано; этап завершён до общего release hardening.

#### Хлебные крошки

Статус: реализовано.

- добавить видимые хлебные крошки на внутренние публичные страницы: каталог,
  товар и ритуал;
- строить видимые breadcrumbs и `BreadcrumbList` JSON-LD из одной модели, чтобы
  подписи и URL не расходились;
- не выводить текущую страницу ссылкой, обозначать её через `aria-current`;
- использовать абсолютные canonical URL в JSON-LD;
- проверить mobile-переносы, keyboard focus и отсутствие горизонтального
  overflow.

Acceptance criteria:

1. На каждой внутренней индексируемой странице есть видимая навигационная
   цепочка.
2. `BreadcrumbList` проходит schema validation и совпадает с видимой цепочкой.
3. Главная не получает избыточные breadcrumbs.

Критерии выполнены: каталог, товар и ритуал используют общий UI-компонент и
одну модель данных для видимой цепочки и `BreadcrumbList`; unit и целевые
Playwright-проверки зелёные.

#### Мобильное меню

Статус: реализовано.

- добавить в header отдельную кнопку меню на viewport, где скрывается desktop
  navigation;
- использовать Lucide-иконки меню и закрытия через общий `IconButton`;
- открывать полноэкранную или почти полноэкранную навигационную панель в
  стилистике Brega Chai с основными ссылками, корзиной и доступными контактами;
- закрывать меню после выбора внутренней ссылки, по кнопке закрытия, `Escape` и
  клику вне панели;
- блокировать фоновый scroll, удерживать focus внутри открытого меню и
  возвращать его на trigger после закрытия;
- корректно отражать `aria-expanded`, `aria-controls`, название кнопки и
  активный маршрут;
- синхронизировать появление overlay/panel с будущей системой motion и
  отключать движение при `prefers-reduced-motion: reduce`;
- не дублировать данные навигации: desktop и mobile menu используют одну модель
  из global settings;
- покрыть keyboard, mobile viewport, scroll lock, focus return и axe
  Playwright-проверками.

Acceptance criteria:

1. На `<=767px` основная навигация доступна через заметную кнопку в header.
2. Все способы открытия и закрытия работают мышью, touch и клавиатурой.
3. Focus не уходит под overlay, а фоновая страница не прокручивается.
4. Переход по ссылке закрывает меню и приводит на выбранный раздел.
5. Desktop header и tablet/desktop navigation не меняются.

Критерии выполнены: меню использует общую модель ссылок с desktop navigation,
Radix Dialog для focus trap и scroll lock, Lucide-иконки и reduced-motion
fallback. Mobile navigation, закрытие, focus return и axe покрыты отдельным
Playwright-набором.

#### Индикатор клиентской навигации

Статус: реализовано.

- адаптировать `NavigationProgress` из `metal-constructions` под дизайн-систему
  Brega Chai и подключить один раз в root layout;
- запускать индикатор только для внутренних переходов на другой pathname,
  игнорируя modified click, hash, download и внешние ссылки;
- показывать его с небольшой задержкой, чтобы быстрые переходы не мигали;
- плавно завершать прогресс после смены pathname;
- отключать анимацию при `prefers-reduced-motion: reduce`;
- покрыть запуск, завершение и исключения focused-тестами.

Критерии выполнены: индикатор подключён в root layout, появляется только после
задержки на внутреннем переходе к другому pathname, корректно завершается и
игнорирует same-page hash navigation. Focused Playwright-проверки зелёные.

#### Локализация Strapi Admin

Статус: реализовано.

- включить `ru` как доступную и основную locale интерфейса Strapi Admin по
  примеру `metal-constructions`;
- добавить точечные русские переводы отсутствующих или неудачных системных
  подписей без форка Strapi;
- перевести `displayName`, `description`, названия компонентов, сущностей и
  редакторские подписи полей во всех content types;
- не менять API keys, UID и публичные DTO ради локализации интерфейса;
- проверить Content Manager, Media Library, товары, ритуалы, страницы, общие
  настройки и заказы.

Acceptance criteria:

1. Новый администратор получает русский интерфейс без ручного переключения.
2. Все пользовательские сущности и поля имеют понятные русские названия.
3. API-контракты storefront после локализации не меняются.

Критерии выполнены: Strapi Admin включает русскую locale, все пользовательские
content types, компоненты, поля и редакторские descriptions переведены без
изменения UID и API keys. Автоматический schema-аудит требует русскую подпись
для каждого нового поля; CMS unit suite и typecheck зелёные.

#### Страница заказа в Strapi Admin

Статус: реализовано по `docs/order-admin-spec.md`.

Решение: внутренний Strapi 5 plugin `order-admin` с отдельными list/detail
страницами. Существующий Content Manager не используется как рабочее место
менеджера; commerce domain остаётся единственным источником бизнес-логики
переходов статуса, изменения stock и пересчёта заказа.

План выполнения:

1. **Контракты и mapper — red → green**
   - определить строгие list/detail DTO и схемы query/status command;
   - написать unit-тесты sanitization, derived counts, currency и timeline;
   - доказать отсутствие технических ключей и лишнего PII в list DTO.
2. **Admin-only server API**
   - создать локальный plugin skeleton и зарегистрировать RBAC actions;
   - реализовать list/detail routes с серверной пагинацией, сортировкой, поиском
     и фильтрами;
   - покрыть auth, permissions, invalid params и not-found integration-тестами.
3. **Status command**
   - направить command только в существующий `transitionStatus`;
   - возвращать обновлённый detail DTO;
   - покрыть разрешённые, запрещённые и конкурентные переходы, а также
     однократный возврат stock.
4. **Edit command**
   - разрешить отдельным RBAC action изменение адреса, состава и комментария
     менеджера только у заказов `new` и `confirmed`;
   - пересчитывать суммы и корректировать stock транзакционно;
   - сохранять snapshot-цены существующих позиций, а новые добавлять по текущей
     цене;
   - защищать конкурентное редактирование через `expectedUpdatedAt`.
5. **Admin list UI**
   - добавить пункт «Заказы», таблицу, status/date filters, поиск, пагинацию и
     empty/error/loading states;
   - использовать Strapi Design System и русские подписи;
   - покрыть component/UI tests основных состояний.
6. **Admin detail UI**
   - собрать шапку, контакты, доставку, snapshot позиций, итог, согласия и
     timeline без сырого JSON;
   - скрыть технические поля и запретить create/delete/arbitrary update;
   - добавить edit dialog с каталогом товаров, количеством, адресом,
     manager comment и предварительным итогом;
   - добавить confirm dialog каждого перехода и pending/error/success
     состояния;
   - сохранять actor snapshot и показывать автора каждого изменения статуса.
7. **RBAC, accessibility и regression**
   - проверить независимые read, transition и edit роли;
   - пройти keyboard flow, focus return, live announcement и axe;
   - запустить CMS unit/typecheck/build, order integration и admin smoke.
8. **Документация и handoff**
   - описать назначение ролей и действия менеджера;
   - обновить architecture/development status;
   - приложить проверяемые acceptance results к PR.

Order-admin срез не включает аналитику, delivery/payment integrations или
повторную отправку уведомлений из плагина. Email о новом заказе реализован
отдельным checkout-срезом.

Критерии выполнены: локальный Strapi plugin предоставляет защищённые list/detail
страницы, серверные фильтры и пагинацию, отдельные read/transition/edit
permissions, безопасные DTO и команды через существующий transactional service.
Карточка не допускает произвольного редактирования и не показывает технические
ключи; узкий edit flow изменяет адрес, позиции и комментарий менеджера с
автоматическим пересчётом сумм и stock. Unit suite, server/admin typecheck,
production Admin build и authenticated Docker/Playwright smoke зелёные;
назначение прав и операционный сценарий описаны в
`docs/order-admin-operations.md`.

#### Страницы и контракты ошибок

Статус: реализовано.

- оформить в общей стилистике отдельные состояния `404`, `500` и `503` с
  понятным следующим действием и без технических деталей;
- `404` использовать только для отсутствующего маршрута или опубликованной
  сущности, не маскируя сбой CMS;
- `500` обрабатывать через route/global error boundaries с повторной попыткой и
  безопасным логированием;
- для недоступности Strapi адаптировать схему последних коммитов
  `sam-mos-dit/strapi-app` + `strapi-next`: короткий readiness-check в
  middleware, rewrite на внутреннюю брендированную страницу с честным `503`,
  `Retry-After`, `Cache-Control: no-store` и `X-Robots-Tag: noindex, nofollow`;
- сохранить server-rendered fallback для CMS-ошибки как defense in depth;
- добавить focused unit и Playwright-проверки HTTP status, SEO headers,
  восстановления после reload и различения `404/500/503`.

Критерии выполнены: `404`, route/global `500` и CMS outage `503` используют
общую брендированную подачу без технических деталей. Публичный readiness
Strapi проверяет соединение с БД, middleware возвращает для outage честный
`503` с `Retry-After`, `no-store` и `noindex, nofollow`, а внутренний route
нельзя открыть напрямую. Сам readiness probe выполняется с коротким timeout и
`cache: no-store`, поэтому восстановление БД видно без окна устаревшего кеша.
Контракты покрыты unit-тестами, `404` и закрытый
служебный route — focused Playwright; реальный Docker-outage проверен
остановкой CMS с последующим восстановлением.

#### Канонизация и 301-редиректы

Статус: реализовано.

- адаптировать middleware-подход из `sam-mos`: за один `301` приводить URL к
  lowercase, удалять trailing slash и мусорные сегменты, обрабатывать
  `/index.html` и `/index.php`;
- определить явный реестр legacy aliases для каталога, товаров и ритуалов;
- удалять пустые query-параметры, сохранять непустые tracking-параметры и не
  создавать redirect chains;
- не канонизировать media, PDF, Next assets, API и внутренний `503` route;
- middleware может обращаться только к дешёвому readiness endpoint для
  определения `503`; content-запросы и проверка существования slug остаются в
  server data layer;
- покрыть таблицей redirect cases: исходный URL, итоговый URL, status и
  количество переходов.

Acceptance criteria:

1. Каждый поддерживаемый «грязный» URL попадает на canonical URL одним `301`.
2. Неизвестная сущность остаётся `404`, а outage CMS — `503`.
3. Статика и API не проходят через URL canonicalization.
4. Canonical metadata совпадает с конечным URL после redirect.

Критерии выполнены: middleware после успешного readiness-check приводит путь
к lowercase, удаляет trailing slash, мусорные сегменты и пустые
query-параметры, обрабатывает `/index.html` и `/index.php`, а также явные
структурные aliases `/catalog`, `/product/:slug` и `/ritual/:slug`. Все
преобразования выполняются одним `301`; непустые query-параметры сохраняются.
API, Next assets, документы и внутренний `503` route исключены. Существование
slug остаётся ответственностью server data layer, поэтому неизвестные сущности
по-прежнему получают `404`. Контракт покрыт табличными unit- и
Playwright-тестами.

#### Runtime-конфигурация storefront

Статус: реализовано.

- один web image используется во всех окружениях без пересборки для каждого
  набора публичных URL;
- `/runtime-config.js` читает allowlist из env контейнера при запуске и
  устанавливает `window.__APP_CONFIG__` до выполнения клиентского приложения;
- публичный allowlist ограничен `SITE_URL`, `NEXT_PUBLIC_CMS_URL` и
  `NEXT_PUBLIC_MEDIA_URL`;
- endpoint использует `Cache-Control: no-store`, JavaScript MIME type,
  `nosniff` и безопасную сериализацию значений;
- `CMS_INTERNAL_URL`, checkout/revalidation secrets, Strapi token, DB и S3
  credentials остаются server-only и не попадают ни в image layers, ни в
  HTML/JavaScript;
- server data layer читает публичный media origin из runtime env через тот же
  типизированный контракт, без build-time fallback.

Acceptance criteria:

1. Один production image запускается с разными публичными URL без rebuild.
2. Allowlisted значения доступны в `window.__APP_CONFIG__` до hydration.
3. Секретные и внутренние значения отсутствуют в runtime script.
4. Неверный публичный URL приводит к явной ошибке конфигурации.
5. Unit и Playwright покрывают allowlist, escaping, runtime override и
   отсутствие секретов.

#### Анимация корзины

Статус: реализовано.

- сделать открытие drawer более мягким и немного продолжительным;
- добавить симметричную exit-анимацию content и overlay при закрытии;
- сохранить DOM на время exit-transition через штатный lifecycle Radix
  Presence, не задерживая восстановление focus;
- синхронизировать easing и длительности overlay/content;
- при reduced motion закрывать и открывать без движения.

Acceptance criteria:

1. Открытие и закрытие корзины визуально плавные и не обрываются.
2. Закрытие по крестику, Escape и клику по overlay использует одну анимацию.
3. Focus возвращается на trigger, scroll lock снимается после закрытия.
4. Состояния покрыты Playwright и visual regression на desktop/mobile.

Критерии выполнены: Radix Presence сохраняет overlay и drawer на время
симметричной exit-анимации, все способы закрытия используют единый
`onOpenChange`, focus возвращается на последний trigger, а
`prefers-reduced-motion` отключает движение. Keyboard/focus lifecycle и axe
проверяются checkout Playwright-сценарием; визуальное поведение подтверждено на
desktop и mobile в ходе layout remediation.

## Hardening и выпуск

### Качество

Статус: в работе.

- visual QA: desktop, tablet и mobile;
- responsive image audit;
- performance budgets и Web Vitals;
- полная keyboard-only проверка;
- axe ключевых страниц и drawer states;
- проверка reduced motion;
- cross-browser smoke при необходимости.

Первая hardening-проверка выполнена:

- существующие visual baselines покрывают главную, каталог, товар, корзину и
  checkout на `390`, `768` и `1440`; layout smoke дополнительно покрывает
  `320`, `1024` и `1920`;
- исправлена фактическая работа `prefers-reduced-motion` для корзины и
  мобильного меню: прежнее правило проигрывало `[data-state]` по специфичности;
- full-screen drawer и мобильное меню получили
  `overscroll-behavior: contain`;
- storefront публикует соответствующий поверхности `theme-color`;
- focused Playwright проверяет reduced motion, overscroll containment и
  browser chrome.
- performance budgets вынесены в версионируемый контракт: synthetic
  `LCP ≤ 2.5s`, `CLS ≤ 0.1`, fonts `≤ 300 KiB`, initial client JS `≤ 180 KiB`;
- production baseline initial JS зафиксирован на `152 019 bytes`, а checkout
  вынесен в отдельный chunk и загружается только при переходе к оформлению;
- INP оставлен production RUM-метрикой, поскольку локальный единичный клик не
  измеряет требуемый p75.
- skip link теперь не только входит первым в Tab-порядок, но и переносит focus
  на общий контейнер контента; checkout при невалидной keyboard-submit
  фокусирует первое ошибочное поле.
- системные состояния `404`, `500` и `503` используют общий семантический
  контракт без ложного live-alert; focused Playwright проверяет axe, действие
  с клавиатуры, честный `404` и защищённый внутренний `503` route.
- cross-browser smoke запускает три критических сценария (`главная`, карточка
  товара, checkout) в Firefox и WebKit; полная E2E-suite остаётся в Chromium,
  чтобы не утраивать время pipeline без дополнительной пользы.
- keyboard-only сценарии покрывают skip link, desktop- и mobile-навигацию,
  карточку товара, breadcrumbs, галерею, quantity, корзину и checkout, включая
  focus trap, первое невалидное поле и возврат focus после закрытия overlay.

Остаются проверка image budgets на финальном production-контенте, подключение
production RUM.

Responsive image audit — реализован:

- hero, preview-карточки, товарная галерея и media внутри Better Blocks получают
  нативные `srcset`/`sizes` из Strapi formats; у «О проекте» и intro каталога
  media-полей больше нет;
- основная товарная галерея использует `large` как базовый источник, thumbnails
  — отдельный `thumbnail`, а карточки — `small`;
- фактический выбор форматов проверен в HTML локального storefront;
- перед выпуском остаётся измерить вес итогового production-контента.

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

### Открытое продуктовое решение

В `ТЗ_сайт_2.docx` запрошен базовый счётчик Яндекс Метрики, тогда как
`product-spec.md` исключает продуктовую веб-аналитику из MVP. До release нужно
явно выбрать одно из двух: отдельный небольшой PR с ID счётчика и согласованным
privacy/consent-контрактом либо документированный перенос после запуска.

## Срез: сверка с исходным ТЗ

- заменить автоматические home-выборки на упорядоченные relations
  `featuredNabory`/`featuredTovary`;
- удалить `active` и `sortOrder`, оставить Draft & Publish единственной
  видимостью;
- сортировать `/tovary` группами `stock > 0`/`stock = 0`, внутри по title;
- унифицировать media карточек на `4:5` и вывести subtitle секций;
- подключить упаковку полной строкой, описание бутика, CMS logo и подпись
  «Telegram»;
- подключить HomePage/global SEO fallback и brandName для Organization/WebSite
  JSON-LD;
- убрать из требований лимит ритуалов и auto-URL-on-scroll;
- унифицировать термины и маршруты как `tovar | nabor`, `/tovary` и `/nabory`;
- production readiness оставить отдельным внешним этапом.

## Текущие обязательные проверки

- lint, typecheck и production build всех packages;
- unit: web, CMS и contracts;
- PostgreSQL order integration harness;
- Playwright production-build suite;
- axe на главной, каталоге, товаре, корзине и checkout;
- `git diff --check`.

## Следующие pull requests

1. `release-hardening` — production-проверки безопасности, наблюдаемости и
   эксплуатационных процедур;
2. `production-content` — финальные тексты, изображения, реквизиты и юридические
   PDF;
3. `release-{semver}` — после появления VPS, настройки DNS/TLS/SMTP и зелёного
   release checklist.
