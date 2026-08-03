# Brega Chai

Интернет-витрина чайного проекта с каталогом, корзиной и оформлением
заказа-заявки. Контент и заказы управляются через Strapi.

## Статус

Функциональный MVP реализован: storefront, CMS-driven контент, каталог,
корзина, checkout, email-уведомление о заказе и рабочее место менеджера в
Strapi Admin покрыты автоматическими проверками. Текущий этап —
`release-hardening` и подготовка production-контента; фактический выпуск ждёт
VPS, DNS/TLS и production-настройки.

## Структура

```text
apps/
├── web/                 # Next.js storefront и BFF
└── cms/                 # Strapi CMS
packages/
└── contracts/           # общие DTO, схемы и domain-функции
docs/
├── adr/                 # архитектурные решения
├── architecture-spec.md
├── design-spec.md
└── product-spec.md
```

UI-компоненты и design tokens остаются в `apps/web`. Отдельный `packages/ui`
не создаётся до появления второго реального потребителя.

## Зафиксированный стек

- Node.js 22 LTS, Yarn 4.14.1 и Turborepo;
- Next.js 15.5.21, React и TypeScript;
- Radix Primitives, CSS Modules и `lucide-react`;
- Strapi 5.45.0 и PostgreSQL 16;
- Zod, React Hook Form и `libphonenumber-js`;
- Node test runner, Playwright и axe-core;
- Docker Compose, Nginx, Certbot и RustFS.

Точные patch-версии и Docker image digests фиксируются lockfile и
инфраструктурной конфигурацией во время bootstrap. Плавающий `latest` не
используется.

## Команды

Основной workflow:

```bash
yarn install
yarn dev
yarn seed
yarn lint
yarn typecheck
yarn test
yarn test:e2e
yarn build
```

## Процесс разработки

Проект ведётся по **specification-driven development** и **TDD**.

1. Поведение сначала фиксируется или уточняется в продуктовой, архитектурной
   либо дизайн-спецификации.
2. Из спецификации выводятся проверяемые acceptance criteria и границы задачи.
3. Изменение начинается с падающего теста, который воспроизводит требуемое
   поведение или дефект.
4. Добавляется минимальная реализация, переводящая тест в зелёное состояние.
5. После этого выполняется рефакторинг без изменения поведения.

Новый функциональный контракт не должен появляться только в коде или тесте.
Тест без соответствующего требования не заменяет спецификацию, а реализация без
предварительного теста допускается только для исследовательского spike, который
не попадает в `main`.

## Документация

- [План разработки](docs/development-plan.md)
- [Продуктовая спецификация](docs/product-spec.md)
- [Архитектурная спецификация](docs/architecture-spec.md)
- [Дизайн-спецификация](docs/design-spec.md)
- [Унификация каталога и URL](docs/catalog-content-unification-spec.md)
- [Checkout и уведомления](docs/checkout-update-spec.md)
- [Управление заказами](docs/order-admin-spec.md)
- [Операционная инструкция менеджера](docs/order-admin-operations.md)
- [Design reference](docs/design-reference.html)
- [Component showcase](docs/component-showcase.html)
- [Architecture Decision Records](docs/adr/)

Production выпускается protected-тегом формата `release-{semver}` на коммите
ветки `main`, например `release-1.0.0`. Merge в `main` сам по себе production
deploy не запускает.
