# Brega Chai

Интернет-витрина чайного проекта с каталогом, корзиной и оформлением
заказа-заявки. Контент и заказы управляются через Strapi.

## Статус

Спецификации утверждены для реализации. Репозиторий находится на этапе
технического bootstrap: структура приложений, локальная инфраструктура и команды
разработки ещё создаются.

## Планируемая структура

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

После завершения bootstrap основной workflow будет выглядеть так:

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

Названия команд пока являются целевым контрактом и могут быть уточнены при
создании корневого `package.json`.

## Документация

- [Продуктовая спецификация](docs/product-spec.md)
- [Архитектурная спецификация](docs/architecture-spec.md)
- [Дизайн-спецификация](docs/design-spec.md)
- [Design reference](docs/design-reference.html)
- [Component showcase](docs/component-showcase.html)
- [Architecture Decision Records](docs/adr/)

Production выпускается protected-тегом формата `release-{semver}` на коммите
ветки `main`, например `release-1.0.0`. Merge в `main` сам по себе production
deploy не запускает.
