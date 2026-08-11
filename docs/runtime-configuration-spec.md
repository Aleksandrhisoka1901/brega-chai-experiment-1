# Runtime-конфигурация и секреты

Статус: обязательная спецификация.

## 1. Цель

Один и тот же immutable Docker image storefront должен запускаться в local,
test и production с разными адресами сервисов без повторной сборки. При этом
ни один секрет, credential или внутренний адрес не должен попадать в
JavaScript, HTML, Docker image layers или Git.

Storefront получает публичную browser-конфигурацию из динамического
`/runtime-config.js`. Endpoint читает env запущенного web-контейнера и до
hydration устанавливает:

```js
window.__APP_CONFIG__ = {
  SITE_URL: "https://brega-chai.example",
  NEXT_PUBLIC_CMS_URL: "https://admin.brega-chai.example",
  NEXT_PUBLIC_MEDIA_URL: "https://media.brega-chai.example/storefront",
};
```

Наличие префикса `NEXT_PUBLIC_` само по себе не разрешает публикацию.
Переменная попадает в браузер только после явного добавления в типизированный
allowlist `PUBLIC_RUNTIME_CONFIG_KEYS`.

## 2. Публичный allowlist

| Переменная              | Потребитель                             | Назначение                                                                | Пример                                        |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `SITE_URL`              | Next server, CMS и browser config       | Origin storefront для canonical URL, Open Graph, sitemap и JSON-LD        | `https://brega-chai.example`                  |
| `NEXT_PUBLIC_CMS_URL`   | Next server и при необходимости браузер | Публичный origin Strapi; fallback для публичных CMS media URL             | `https://admin.brega-chai.example`            |
| `NEXT_PUBLIC_MEDIA_URL` | Next server и browser config            | Публичный origin RustFS/CDN, из которого посетитель загружает изображения | `https://media.brega-chai.example/storefront` |

Значения:

- являются абсолютными `http://` или `https://` URL;
- не содержат username/password;
- меняются через runtime env без rebuild;
- могут быть без риска показаны любому посетителю.

`/runtime-config.js` возвращает `Cache-Control: no-store`,
`Content-Type: application/javascript; charset=utf-8` и
`X-Content-Type-Options: nosniff`. JSON сериализуется с экранированием
script-breaking символов.

## 3. Server-only конфигурация

Эти значения не являются browser config, даже если отдельные из них не дают
прямого доступа к данным.

| Переменная                         | Контейнеры          | Назначение                                                     |
| ---------------------------------- | ------------------- | -------------------------------------------------------------- |
| `CMS_INTERNAL_URL`                 | web                 | Внутренний адрес Strapi для Server Components, BFF и readiness |
| `CHECKOUT_FORM_SECRET`             | web                 | Подпись и проверка серверного токена checkout-формы            |
| `STRAPI_ORDER_TOKEN`               | web                 | Least-privilege токен создания заказа в Strapi                 |
| `CACHE_REVALIDATION_URL`           | cms                 | Внутренний Next endpoint для cache revalidation                |
| `CACHE_REVALIDATION_SECRET`        | web, cms            | HMAC-подпись cache revalidation                                |
| `CACHE_REVALIDATION_TIMEOUT_MS`    | cms                 | Таймаут отправки revalidation                                  |
| `STRAPI_URL`                       | cms                 | Публичный HTTPS origin Strapi для абсолютных URL               |
| `DATABASE_HOST/PORT/NAME/USERNAME` | cms, служебные jobs | Параметры соединения с PostgreSQL                              |
| `S3_ENDPOINT/REGION/BUCKET`        | cms, служебные jobs | Внутренние параметры object storage                            |
| `MEDIA_PUBLIC_URL`                 | cms                 | Публичная база URL, которую Strapi записывает для media        |

`CMS_INTERNAL_URL`, внутренние S3/DB endpoints и служебные timeout не являются
криптографическими секретами, но раскрывают топологию или не нужны клиенту.
Поэтому они остаются server-only.

## 4. Секреты и credentials

| Переменная                  | Контейнеры     | Назначение                              |
| --------------------------- | -------------- | --------------------------------------- |
| `POSTGRES_PASSWORD`         | postgres       | Пароль владельца PostgreSQL             |
| `DATABASE_PASSWORD`         | cms            | Пароль подключения Strapi к PostgreSQL  |
| `RUSTFS_ACCESS_KEY`         | rustfs/init    | Идентификатор доступа RustFS            |
| `RUSTFS_SECRET_KEY`         | rustfs/init    | Секрет доступа RustFS                   |
| `S3_ACCESS_KEY_ID`          | cms            | Идентификатор S3-доступа Strapi         |
| `S3_ACCESS_SECRET`          | cms            | Секрет S3-доступа Strapi                |
| `APP_KEYS`                  | cms            | Подпись cookies Strapi                  |
| `ADMIN_JWT_SECRET`          | cms            | Подпись административных JWT            |
| `JWT_SECRET`                | cms            | Подпись JWT Strapi                      |
| `API_TOKEN_SALT`            | cms            | Защита API tokens                       |
| `TRANSFER_TOKEN_SALT`       | cms            | Защита transfer tokens                  |
| `ENCRYPTION_KEY`            | cms            | Шифрование чувствительных данных Strapi |
| deploy/registry credentials | CI/deploy host | Получение images и доступ к VPS         |

Access key/username не всегда является секретом сам по себе, но публиковать его
без необходимости запрещено. Все пары access key/secret рассматриваются как
единый credential.

## 5. Где хранятся значения

### 5.1. Локальная разработка

- значения хранятся в корневом `.env`;
- `.env` не коммитится;
- `.env.example` содержит только имена, безопасные local defaults и пустые
  placeholders;
- реальные production credentials нельзя использовать локально;
- при утечке локального секрета он ротируется, а не просто удаляется из Git.

### 5.2. CI/CD и production

- secrets создаются в GitHub Environment `production`;
- production variables и secrets доступны только jobs, явно использующим
  environment `production`;
- SSH private key и `known_hosts` хранятся как environment secrets;
- на VPS runtime env хранится вне Git и доступен только deploy-пользователю;
- Docker Compose передаёт каждому сервису только необходимые ему значения;
- secrets не передаются через Docker `ARG` и не записываются постоянным
  `ENV` в Dockerfile;
- логи pipeline, deploy scripts и application logs не выводят значения env.

GitHub Actions variable или secret становится доступна контейнеру только после
явной безопасной передачи deploy-механизмом. Сам факт создания значения не
настраивает runtime env автоматически.

## 6. Запрещённые места

Секреты и server-only значения запрещено помещать:

- в `PUBLIC_RUNTIME_CONFIG_KEYS` и `window.__APP_CONFIG__`;
- в любой `NEXT_PUBLIC_*` без отдельного security review;
- в client components, HTML, JSON-LD или публичные API responses;
- в Git, `.env.example`, fixtures и snapshots;
- в Docker build arguments, image labels или постоянные image environment;
- в URL, query string, имена файлов и команды, выводимые CI;
- в сообщения браузеру, telemetry payload и application logs.

## 7. Добавление новой переменной

Перед добавлением владелец изменения отвечает на вопросы:

1. Нужно ли значение браузеру, или достаточно Server Component/BFF?
2. Допустимо ли без последствий показать значение любому посетителю?
3. Даёт ли оно доступ, полномочие подписи или сведения о внутренней топологии?
4. Можно ли получить значение из уже существующей конфигурации или request
   origin?

Новая публичная переменная требует:

- изменения `PublicRuntimeConfigKey` через allowlist;
- URL/schema validation;
- описания назначения и владельца в этой спецификации;
- unit-теста, подтверждающего allowlist и escaping;
- Playwright-проверки runtime override;
- negative-теста, подтверждающего отсутствие связанных секретов.

Если хотя бы на один вопрос безопасности нет однозначного ответа, переменная
остаётся server-only.

## 8. Acceptance criteria

1. Один собранный standalone/Docker artifact принимает разные публичные URL при
   повторном запуске без rebuild.
2. Runtime script содержит только три allowlisted значения.
3. Canonical metadata и media origin используют env запущенного контейнера.
4. Секреты отсутствуют в runtime script, HTML, client bundle и логах.
5. Неверный публичный URL приводит к явной configuration error.
6. Unit, typecheck, lint и focused Playwright остаются зелёными.
