# ADR-004: Production, media и deploy

- Статус: принято
- Дата: 28 июля 2026

## Контекст

Для MVP нужен простой и воспроизводимый production без отдельного staging.
Сборка на сервере усложняет deploy, а хранение media внутри CMS-контейнера
связывает пользовательские файлы с его жизненным циклом. Релиз не должен менять
production, пока проверки не завершились успешно.

## Решение

Разместить production на одном VPS в Docker Compose:

- Nginx завершает TLS и маршрутизирует storefront, `admin.{domain}` и
  `media.{domain}`;
- Certbot работает отдельным Compose-сервисом;
- web, CMS, PostgreSQL и RustFS находятся в private Docker network;
- Nginx публикует только read-only объекты storefront bucket RustFS;
- данные PostgreSQL, RustFS и сертификаты находятся на persistent volumes.

GitHub Actions собирает immutable web/CMS images по commit SHA и публикует их в
GitHub Container Registry (GHCR). Production deploy запускает только защищённый
GitHub ruleset тег `release-{semver}` на коммите из `main`. Deploy зависит от
зелёных lint, typecheck, test, build, smoke/a11y и image jobs. VPS скачивает
готовые images через непривилегированного SSH-пользователя `deploy`;
self-hosted GitHub Actions runner и исходный build toolchain на VPS не
устанавливаются.

Перед deploy создаётся backup PostgreSQL и RustFS. После запуска выполняются
healthcheck и smoke-check. При ошибке healthcheck pipeline возвращает предыдущие
web/CMS images; данные и schema автоматически не откатываются. Автоматический
deploy принимает только backward-compatible schema changes.

Ежедневный локальный backup хранит только последнюю копию на отдельном
persistent path того же VPS. Новая копия перед deploy заменяет предыдущую.
Off-site backup отложен.

## Последствия

- Релиз воспроизводим и связан с конкретным commit SHA.
- Merge в `main` не изменяет production.
- Отказ диска или потеря VPS уничтожит и рабочие данные, и локальные backup;
  этот принятый для MVP риск нужно закрыть off-site копированием позднее.
- Удаление, переименование или смена типа поля требуют отдельной миграции,
  backup и явного подтверждения в release PR.
- Версии RustFS и остальных container images фиксируются; автоматические
  обновления запрещены.
- Для восстановления данных нужна документированная ручная команда.

## Связанные документы

- [Архитектурная спецификация, разделы 15, 16, 21 и 22](../architecture-spec.md)
