#!/bin/sh
set -eu

action=${1:-}
deploy_path=${2:-}
run_id=${3:-}
run_attempt=${4:-}

case "$deploy_path" in
  /*) ;;
  *) echo "Deployment path must be absolute" >&2; exit 1 ;;
esac
if [ "$deploy_path" = "/" ]; then
  echo "Refusing to use the filesystem root as deployment path" >&2
  exit 1
fi
case "$deploy_path" in
  *'/../'*|*/..|*'/./'*|*/.|*'//'* )
    echo "Deployment path must be normalized" >&2
    exit 1
    ;;
esac
case "$run_id" in
  ''|*[!0-9]*) echo "Run ID must be numeric" >&2; exit 1 ;;
esac
case "$run_attempt" in
  ''|*[!0-9]*) echo "Run attempt must be numeric" >&2; exit 1 ;;
esac

state_root="$deploy_path/.release-state"
state_dir="$state_root/${run_id}-${run_attempt}"
backup_root="$deploy_path/deployment-config-backups"
backup_archive="$state_dir/config.tar.gz"
candidate_archive="$state_dir/reviewed-config.tar.gz"
compose_files="-f docker-compose.yml -f docker-compose.production.yml"

required_paths="
docker-compose.yml
docker-compose.production.yml
docker-compose.tls.yml
infra
scripts
"

require_layout() {
  root=$1
  for relative_path in $required_paths; do
    test -e "$root/$relative_path" || {
      echo "Required deployment path is missing: $relative_path" >&2
      return 1
    }
  done
}

validate_archive() {
  archive=$1
  tar -tzf "$archive" >/dev/null
  tar -tvzf "$archive" |
    awk '
      substr($1, 1, 1) != "-" && substr($1, 1, 1) != "d" {
        exit 1
      }
    ' || {
      echo "Deployment archive must contain only regular files and directories" >&2
      return 1
    }
  tar -tzf "$archive" |
    while IFS= read -r entry; do
      entry=${entry#./}
      case "$entry" in
        /*|../*|*/../*|*/..)
          echo "Unsafe deployment archive entry: $entry" >&2
          exit 1
          ;;
      esac
      case "$entry" in
        docker-compose.yml|docker-compose.production.yml|docker-compose.tls.yml|infra|infra/*|scripts|scripts/*) ;;
        *)
          echo "Unexpected deployment archive entry: $entry" >&2
          exit 1
          ;;
      esac
    done
}

resolve_service_image() {
  service=$1
  container_id=$(docker ps -a \
    --filter label=com.docker.compose.project=brega-chai \
    --filter "label=com.docker.compose.service=$service" \
    --format '{{.ID}}' | head -n 1)
  test -n "$container_id" || {
    echo "Cannot find the current $service container" >&2
    return 1
  }
  docker inspect --format '{{.Config.Image}}' "$container_id"
}

wait_service() {
  service=$1
  url=$2
  attempt=0
  until docker compose $compose_files exec -T "$service" node -e \
    "fetch('$url').then(r=>{if(!r.ok&&r.status!==302)process.exit(1)}).catch(()=>process.exit(1))"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      return 1
    fi
    sleep 2
  done
}

preserve_state() {
  result=$1
  keep=${DEPLOY_CONFIG_BACKUP_KEEP:-3}
  case "$keep" in
    ''|*[!0-9]*|0) echo "DEPLOY_CONFIG_BACKUP_KEEP must be a positive integer" >&2; return 1 ;;
  esac

  rm -rf "$state_dir/candidate"
  rm -f "$candidate_archive"
  mkdir -p "$backup_root"
  destination="$backup_root/${run_id}-${run_attempt}-${result}"
  test ! -e "$destination"
  mv "$state_dir" "$destination"

  find "$backup_root" -mindepth 1 -maxdepth 1 -type d |
    sort -r |
    awk "NR > ${keep}" |
    while IFS= read -r expired; do
      rm -rf -- "$expired"
    done

  echo "Deployment configuration backup preserved: $destination"
}

prepare() {
  require_layout "$deploy_path"
  test ! -e "$state_dir" || {
    echo "Release state already exists: $state_dir" >&2
    exit 1
  }

  umask 077
  mkdir -p "$state_dir"
  cp "$0" "$state_dir/recovery.sh"
  chmod 700 "$state_dir/recovery.sh"

  cd "$deploy_path"
  tar -czf "$backup_archive" \
    docker-compose.yml \
    docker-compose.production.yml \
    docker-compose.tls.yml \
    infra \
    scripts
  validate_archive "$backup_archive"

  resolve_service_image web >"$state_dir/previous-web-image"
  resolve_service_image cms >"$state_dir/previous-cms-image"
  test -s "$state_dir/previous-web-image"
  test -s "$state_dir/previous-cms-image"
  touch "$state_dir/prepared"
  echo "Current deployment configuration and image references backed up."
}

install() {
  test -f "$state_dir/prepared"
  test -f "$candidate_archive"
  validate_archive "$candidate_archive"

  candidate="$state_dir/candidate"
  test ! -e "$candidate"
  mkdir -p "$candidate"
  tar -xzf "$candidate_archive" -C "$candidate"
  require_layout "$candidate"
  if [ -n "$(find "$candidate" -type l -print -quit)" ]; then
    echo "Deployment configuration must not contain symbolic links" >&2
    exit 1
  fi
  sh -n "$candidate"/scripts/*.sh

  touch "$state_dir/installing"
  rm -rf "$deploy_path/infra" "$deploy_path/scripts"
  mv "$candidate/infra" "$deploy_path/infra"
  mv "$candidate/scripts" "$deploy_path/scripts"
  mv "$candidate/docker-compose.yml" "$deploy_path/docker-compose.yml"
  mv "$candidate/docker-compose.production.yml" "$deploy_path/docker-compose.production.yml"
  mv "$candidate/docker-compose.tls.yml" "$deploy_path/docker-compose.tls.yml"
  rmdir "$candidate"
  rm -f "$candidate_archive"
  require_layout "$deploy_path"
  touch "$state_dir/installed"
  echo "Reviewed deployment configuration installed."
}

restore() {
  test -f "$state_dir/prepared"
  if [ ! -f "$state_dir/installing" ]; then
    preserve_state aborted
    echo "Deployment configuration was not changed; restore was unnecessary."
    return 0
  fi

  validate_archive "$backup_archive"
  rm -rf "$deploy_path/infra" "$deploy_path/scripts"
  rm -f \
    "$deploy_path/docker-compose.yml" \
    "$deploy_path/docker-compose.production.yml" \
    "$deploy_path/docker-compose.tls.yml"
  tar -xzf "$backup_archive" -C "$deploy_path"
  require_layout "$deploy_path"

  IFS= read -r WEB_IMAGE <"$state_dir/previous-web-image"
  IFS= read -r CMS_IMAGE <"$state_dir/previous-cms-image"
  test -n "$WEB_IMAGE"
  test -n "$CMS_IMAGE"
  export WEB_IMAGE CMS_IMAGE

  cd "$deploy_path"
  docker compose $compose_files config >/dev/null
  docker compose $compose_files up -d postgres rustfs rustfs-init
  docker compose $compose_files up -d cms
  wait_service cms http://127.0.0.1:1337/admin
  docker compose $compose_files up -d web
  wait_service web http://127.0.0.1:3000
  docker compose $compose_files up -d --force-recreate --no-deps nginx

  preserve_state failed
  echo "Previous deployment configuration and application images restored."
}

finalize() {
  test -f "$state_dir/installed"
  preserve_state successful
}

case "$action" in
  prepare) prepare ;;
  install) install ;;
  restore) restore ;;
  finalize) finalize ;;
  *)
    echo "Usage: $0 {prepare|install|restore|finalize} <deploy-path> <run-id> <run-attempt>" >&2
    exit 1
    ;;
esac
