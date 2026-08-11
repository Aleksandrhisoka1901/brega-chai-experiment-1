# Переезд в GitHub

Целевой репозиторий: <https://github.com/Aleksandr190101996/brega-chai>.

## Стратегия переноса истории

GitLab `main` и существующий GitHub `main` начинались с независимых root
commits. Ветка `chore/github-migration` объединяет их обычным merge-коммитом с
`--allow-unrelated-histories`. Поэтому миграционный pull request можно влить в
GitHub без force-push: вместе с отдельно перенесёнными ветками и тегами в
итоговом графе сохранятся все доступные исходные commits и первоначальный
GitHub commit с проверкой SSH.

GitLab остаётся нетронутым архивным источником. Переезд не удаляет его ветки,
теги, pipelines, variables, Container Registry или историю.

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

На время cutover те же variables и `DEPLOY_KNOWN_HOSTS` настроены на уровне
репозитория. Workflows также поддерживают существующий repository secret
`SSH_PRIVATE_KEY` как fallback. Владелец репозитория должен создать environment
`production` и перенести значения туда, чтобы ограничить их только deploy jobs.

Registry credential переносить из GitLab не требуется. Release workflow
публикует и скачивает связанные с репозиторием GHCR packages через
короткоживущий `GITHUB_TOKEN`, в том числе передаёт его VPS непосредственно
перед `docker compose pull`.

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

## Завершение cutover

После зелёного CI и merge миграционного PR:

1. Убедиться, что GitHub содержит все нужные release tags и рабочие ветки.
2. Выполнить ручной `TLS renewal` и проверить SSH/known_hosts.
3. Выпустить новый `release-X.Y.Z`; проверить GHCR packages, backup, deploy,
   health и storefront smoke.
4. Только после успешного release переключить локальные имена remote:

   ```bash
   git remote rename origin gitlab
   git remote rename github origin
   ```

Эта операция меняет только локальную конфигурацию clone. GitLab remote и все
данные на GitLab сохраняются.
