#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
temporary_root=$(mktemp -d)
cleanup() {
  rm -rf "$temporary_root"
}
trap cleanup EXIT INT TERM

fake_bin="$temporary_root/bin"
deploy_path="$temporary_root/deploy"
reviewed_path="$temporary_root/reviewed"
docker_log="$temporary_root/docker.log"
mkdir -p "$fake_bin" "$deploy_path" "$reviewed_path"

write_layout() {
  root=$1
  marker=$2
  mkdir -p "$root/infra/nginx" "$root/scripts"
  printf '%s\n' "$marker-compose" >"$root/docker-compose.yml"
  printf '%s\n' "$marker-production" >"$root/docker-compose.production.yml"
  printf '%s\n' "$marker-tls" >"$root/docker-compose.tls.yml"
  printf '%s\n' "$marker-infra" >"$root/infra/nginx/default.conf"
  printf '%s\n' '#!/bin/sh' "echo $marker-script" >"$root/scripts/deploy.sh"
  chmod 700 "$root/scripts/deploy.sh"
}

write_layout "$deploy_path" old
write_layout "$reviewed_path" new

cat >"$fake_bin/docker" <<'FAKE_DOCKER'
#!/bin/sh
set -eu
printf '%s\n' "$*" >>"$DOCKER_LOG"
printf 'images=%s|%s\n' "${WEB_IMAGE:-}" "${CMS_IMAGE:-}" >>"$DOCKER_LOG"
case "$1 ${2:-}" in
  "ps -a")
    case "$*" in
      *service=web*) echo web-container ;;
      *service=cms*) echo cms-container ;;
      *) exit 1 ;;
    esac
    ;;
  "inspect --format")
    case "${4:-}" in
      web-container) echo registry.example/web:old ;;
      cms-container) echo registry.example/cms:old ;;
      *) exit 1 ;;
    esac
    ;;
  "compose -f")
    exit 0
    ;;
  *)
    echo "Unexpected docker invocation: $*" >&2
    exit 1
    ;;
esac
FAKE_DOCKER
chmod 700 "$fake_bin/docker"

export DOCKER_LOG="$docker_log"
export PATH="$fake_bin:$PATH"
if "$project_root/scripts/deployment-config.sh" \
  prepare "$deploy_path/../outside" 1 1; then
  echo "Non-normalized deployment paths must be rejected" >&2
  exit 1
fi
run_id=12345
run_attempt=2
state_dir="$deploy_path/.release-state/${run_id}-${run_attempt}"

"$project_root/scripts/deployment-config.sh" \
  prepare "$deploy_path" "$run_id" "$run_attempt"

test -s "$state_dir/config.tar.gz"
test "$(cat "$state_dir/previous-web-image")" = registry.example/web:old
test "$(cat "$state_dir/previous-cms-image")" = registry.example/cms:old
test -x "$state_dir/recovery.sh"

tar -czf "$state_dir/reviewed-config.tar.gz" \
  -C "$reviewed_path" \
  docker-compose.yml \
  docker-compose.production.yml \
  docker-compose.tls.yml \
  infra \
  scripts

"$state_dir/recovery.sh" \
  install "$deploy_path" "$run_id" "$run_attempt"

test "$(cat "$deploy_path/docker-compose.yml")" = new-compose
test "$(cat "$deploy_path/infra/nginx/default.conf")" = new-infra
test "$("$deploy_path/scripts/deploy.sh")" = new-script

"$state_dir/recovery.sh" \
  restore "$deploy_path" "$run_id" "$run_attempt"

test "$(cat "$deploy_path/docker-compose.yml")" = old-compose
test "$(cat "$deploy_path/infra/nginx/default.conf")" = old-infra
test "$("$deploy_path/scripts/deploy.sh")" = old-script
test -d "$deploy_path/deployment-config-backups/${run_id}-${run_attempt}-failed"
test ! -e "$state_dir"
grep -q 'registry\.example/web:old' "$docker_log"
grep -q 'registry\.example/cms:old' "$docker_log"
grep -q 'up -d --force-recreate --no-deps nginx' "$docker_log"

success_run=12346
success_state="$deploy_path/.release-state/${success_run}-1"
"$project_root/scripts/deployment-config.sh" \
  prepare "$deploy_path" "$success_run" 1
tar -czf "$success_state/reviewed-config.tar.gz" \
  -C "$reviewed_path" \
  docker-compose.yml \
  docker-compose.production.yml \
  docker-compose.tls.yml \
  infra \
  scripts
"$success_state/recovery.sh" \
  install "$deploy_path" "$success_run" 1
"$success_state/recovery.sh" \
  finalize "$deploy_path" "$success_run" 1
test -d "$deploy_path/deployment-config-backups/${success_run}-1-successful"

unsafe_run=12347
unsafe_state="$deploy_path/.release-state/${unsafe_run}-1"
"$project_root/scripts/deployment-config.sh" \
  prepare "$deploy_path" "$unsafe_run" 1
mkdir -p "$temporary_root/unsafe"
printf '%s\n' unexpected >"$temporary_root/unsafe/unexpected.txt"
tar -czf "$unsafe_state/reviewed-config.tar.gz" \
  -C "$temporary_root/unsafe" unexpected.txt
if "$unsafe_state/recovery.sh" \
  install "$deploy_path" "$unsafe_run" 1; then
  echo "Unexpected deployment archive must be rejected" >&2
  exit 1
fi
"$unsafe_state/recovery.sh" \
  restore "$deploy_path" "$unsafe_run" 1
test -d "$deploy_path/deployment-config-backups/${unsafe_run}-1-aborted"

symlink_run=12348
symlink_state="$deploy_path/.release-state/${symlink_run}-1"
"$project_root/scripts/deployment-config.sh" \
  prepare "$deploy_path" "$symlink_run" 1
mkdir -p "$temporary_root/symlink/scripts" "$temporary_root/symlink/infra"
ln -s /tmp "$temporary_root/symlink/scripts/escape"
tar -czf "$symlink_state/reviewed-config.tar.gz" \
  -C "$temporary_root/symlink" scripts infra
if "$symlink_state/recovery.sh" \
  install "$deploy_path" "$symlink_run" 1; then
  echo "Symbolic links in deployment archives must be rejected" >&2
  exit 1
fi
"$symlink_state/recovery.sh" \
  restore "$deploy_path" "$symlink_run" 1
test -d "$deploy_path/deployment-config-backups/${symlink_run}-1-aborted"

echo "Deployment configuration backup and rollback tests passed."
