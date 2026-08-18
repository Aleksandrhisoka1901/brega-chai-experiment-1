#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
temporary_root=$(mktemp -d)
cleanup() {
  rm -rf "$temporary_root"
}
trap cleanup EXIT INT TERM

fake_bin="$temporary_root/bin"
mkdir -p "$fake_bin"

cat >"$fake_bin/docker" <<'FAKE_DOCKER'
#!/bin/sh
set -eu

printf 'docker|%s|web=%s|cms=%s\n' \
  "$*" "${WEB_IMAGE:-}" "${CMS_IMAGE:-}" >>"$DEPLOY_TEST_LOG"

case "$1" in
  inspect)
    case "${4:-}" in
      web-container) printf '%s\n' registry.example/web:old ;;
      cms-container) printf '%s\n' registry.example/cms:old ;;
      *) exit 1 ;;
    esac
    ;;
  compose)
    case "$*" in
      *" ps -q web") printf '%s\n' web-container ;;
      *" ps -q cms") printf '%s\n' cms-container ;;
      *" pull web cms")
        if [ "${FAKE_PULL_FAILURE:-0}" -eq 1 ]; then
          exit 1
        fi
        ;;
    esac
    ;;
  *)
    echo "Unexpected docker invocation: $*" >&2
    exit 1
    ;;
esac
FAKE_DOCKER
chmod 700 "$fake_bin/docker"

cat >"$fake_bin/curl" <<'FAKE_CURL'
#!/bin/sh
set -eu
printf 'curl|%s\n' "$*" >>"$DEPLOY_TEST_LOG"
FAKE_CURL
chmod 700 "$fake_bin/curl"

prepare_scenario() {
  scenario_root=$1
  mkdir -p "$scenario_root/scripts"
  cp "$project_root/scripts/deploy.sh" "$scenario_root/scripts/deploy.sh"
  chmod 700 "$scenario_root/scripts/deploy.sh"
  cat >"$scenario_root/scripts/backup.sh" <<'FAKE_BACKUP'
#!/bin/sh
set -eu
printf 'backup|web=%s|cms=%s\n' \
  "$WEB_IMAGE" "$CMS_IMAGE" >>"$DEPLOY_TEST_LOG"
FAKE_BACKUP
  chmod 700 "$scenario_root/scripts/backup.sh"
  : >"$scenario_root/docker-compose.yml"
  : >"$scenario_root/docker-compose.production.yml"
}

failed_root="$temporary_root/pull-failure"
failed_log="$temporary_root/pull-failure.log"
prepare_scenario "$failed_root"

if (
  cd "$failed_root"
  PATH="$fake_bin:$PATH" \
    DEPLOY_TEST_LOG="$failed_log" \
    FAKE_PULL_FAILURE=1 \
    WEB_IMAGE=registry.example/web:new \
    CMS_IMAGE=registry.example/cms:new \
    SMOKE_URL=https://storefront.example \
    ./scripts/deploy.sh
); then
  echo "Deploy must fail when target image pull fails" >&2
  exit 1
fi

grep -q 'pull web cms' "$failed_log"
if grep -q '^backup|' "$failed_log"; then
  echo "Backup must not stop writes before target images are available" >&2
  exit 1
fi
if grep -q ' up -d ' "$failed_log"; then
  echo "Pull failure must leave the running stack untouched" >&2
  exit 1
fi

success_root="$temporary_root/success"
success_log="$temporary_root/success.log"
prepare_scenario "$success_root"

(
  cd "$success_root"
  PATH="$fake_bin:$PATH" \
    DEPLOY_TEST_LOG="$success_log" \
    FAKE_PULL_FAILURE=0 \
    WEB_IMAGE=registry.example/web:new \
    CMS_IMAGE=registry.example/cms:new \
    SMOKE_URL=https://storefront.example \
    ./scripts/deploy.sh
)

grep -q '^backup|web=registry\.example/web:old|cms=registry\.example/cms:old$' \
  "$success_log"
pull_line=$(grep -n 'pull web cms' "$success_log" | cut -d: -f1)
backup_line=$(grep -n '^backup|' "$success_log" | cut -d: -f1)
test "$pull_line" -lt "$backup_line"

echo "Deploy pre-pull and backup image tests passed."
