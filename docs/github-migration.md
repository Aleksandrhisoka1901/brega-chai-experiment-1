# Переезд в GitHub

Целевой репозиторий: <https://github.com/Aleksandr190101996/brega-chai>.

## Стратегия переноса истории

GitLab `main` и существующий GitHub `main` начинались с независимых root
commits. Ветка `chore/github-migration` объединяет их обычным merge-коммитом с
`--allow-unrelated-histories`. Поэтому миграционный pull request можно влить в
GitHub без force-push: вместе с отдельно перенесёнными ветками и тегами в
итоговом графе сохранятся все доступные исходные commits и первоначальный
GitHub commit с проверкой SSH.

Прежний GitLab-репозиторий остаётся нетронутым архивом вне активной
конфигурации проекта. В локальной копии нет remote, workflows или credentials,
связывающих проект с GitLab; его ветки, теги, pipelines, variables, Container
Registry и история не изменялись.

## Что уже находится в репозитории

- `.github/workflows/ci.yml` — полный quality/build/integration/E2E gate для PR
  и `main`, а также reusable gate для release;
- `.github/workflows/release.yml` — проверка `release-X.Y.Z`, публикация web/CMS
  images по commit SHA в GHCR, container smoke и production deploy;
- `.github/workflows/tls-renew.yml` — ежедневный TLS renewal в 02:17 UTC
  (05:17 Europe/Moscow) и ручной запуск;
- `.github/actions/setup-workspace/action.yml` — единая установка Node/Yarn;
- GitHub-терминология и GHCR закреплены в архитектурных и эксплуатационных
  документах.

## Настройки GitHub перед первым release

### Actions

В `Settings → Actions → General` разрешить используемые GitHub и Docker actions.
Default `GITHUB_TOKEN` можно оставить read-only: workflow выдаёт `packages:
write` только jobs, публикующим images.

### Environment `production`

Создать environment `production` и добавить variables:

| Variable      | Назначение                                       |
| ------------- | ------------------------------------------------ |
| `DEPLOY_HOST` | hostname или IP production VPS                   |
| `DEPLOY_USER` | непривилегированный SSH-пользователь             |
| `DEPLOY_PATH` | каталог Compose на VPS, обычно `/opt/brega-chai` |
| `SMOKE_URL`   | публичный HTTPS URL storefront                   |

Добавить environment secrets:

| Secret                   | Назначение                          |
| ------------------------ | ----------------------------------- |
| `DEPLOY_SSH_PRIVATE_KEY` | приватный deploy key без passphrase |
| `DEPLOY_KNOWN_HOSTS`     | закреплённая строка host key VPS    |

Deploy variables и `DEPLOY_KNOWN_HOSTS` хранятся только в environment
`production`. Workflows временно поддерживают существующий repository secret
`SSH_PRIVATE_KEY` как fallback, пока отдельный `DEPLOY_SSH_PRIVATE_KEY` не будет
установлен на VPS и добавлен в environment.

Ручной workflow `.github/workflows/deployment-preflight.yml` проверяет значения
environment, SSH, Docker/Compose, свободное место, наличие production-сервисов,
временный GHCR login и публичный storefront. Он не запускает `deploy.sh`, не
передаёт конфигурацию и не перезапускает контейнеры.

Release workflow публикует и скачивает связанные с репозиторием GHCR packages
через короткоживущий `GITHUB_TOKEN`, в том числе передаёт его VPS
непосредственно перед `docker compose pull`.

Перед переносом новой Compose/nginx/scripts конфигурации workflow сохраняет на
VPS предыдущую конфигурацию и точные ссылки на работающие web/CMS images. Если
перенос или `deploy.sh` завершается ошибкой, workflow восстанавливает оба слоя,
заново поднимает сервисы и требует успешный публичный smoke-check. Pre-deploy
backup также проверяет читаемость PostgreSQL dump и архива RustFS; восстановление
данных остаётся отдельной ручной операцией.

### Rulesets

Для ветки `main`:

- запретить force-push и удаление;
- требовать pull request;
- требовать успешные checks `Format`, `Contracts`, `Web`, `CMS`, `Production
config`, `Commerce integration`, `Web build`, `CMS build`, `Web E2E`;
- включить requirement актуальности ветки перед merge при приемлемой стоимости
  повторного CI.

Для тегов `release-*`:

- запретить update и delete;
- ограничить создание владельцами репозитория;
- не разрешать bypass без отдельного операционного решения.

`release.yml` дополнительно отклоняет нестрогий SemVer и теги, чей commit не
входит в `main`.

## Состояние после cutover

Cutover завершён: `origin` указывает только на GitHub.

```bash
git remote -v
# origin  git@github.com:Aleksandr190101996/brega-chai.git (fetch)
# origin  git@github.com:Aleksandr190101996/brega-chai.git (push)
```

CI, releases, GHCR и production automation работают только через GitHub.
Production deploy по-прежнему запускается исключительно тегом
`release-X.Y.Z`; обычный push или merge в `main` выполняет только CI.
