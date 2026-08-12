#!/bin/sh
set -eu

compose_files="-f docker-compose.yml -f docker-compose.production.yml"
backup_root=${BACKUP_ROOT:-./backups}
keep=${BACKUP_KEEP:-1}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="${backup_root}/${timestamp}"
archive_image=alpine:3.22.1

resolve_service_image() {
  service=$1
  docker ps -a \
    --filter "label=com.docker.compose.project=brega-chai" \
    --filter "label=com.docker.compose.service=$service" \
    --format '{{.Image}}' |
    head -n 1
}

WEB_IMAGE=${WEB_IMAGE:-$(resolve_service_image web)}
CMS_IMAGE=${CMS_IMAGE:-$(resolve_service_image cms)}
: "${WEB_IMAGE:?Cannot resolve the current web image}"
: "${CMS_IMAGE:?Cannot resolve the current CMS image}"
export WEB_IMAGE CMS_IMAGE

case "$keep" in
  ''|*[!0-9]*) echo "BACKUP_KEEP must be a positive integer" >&2; exit 1 ;;
  0) echo "BACKUP_KEEP must be greater than zero" >&2; exit 1 ;;
esac

mkdir -p "$destination"

restart_writes() {
  docker compose $compose_files up -d rustfs rustfs-init cms web
}
trap restart_writes EXIT INT TERM

docker compose $compose_files stop web cms rustfs

docker compose $compose_files exec -T postgres sh -eu -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom' \
  > "${destination}/postgres.dump"

rustfs_container=$(docker compose $compose_files ps -aq rustfs)
test -n "$rustfs_container"
docker run --rm --volumes-from "$rustfs_container" \
  -v "$(cd "$destination" && pwd):/backup" \
  "$archive_image" tar -czf /backup/rustfs.tar.gz -C /data .

printf '%s\n' "${DEPLOY_COMMIT_SHA:-unknown}" > "${destination}/commit-sha"

test -s "${destination}/postgres.dump"
docker compose $compose_files exec -T postgres \
  pg_restore --list < "${destination}/postgres.dump" >/dev/null
test -s "${destination}/rustfs.tar.gz"
docker run --rm \
  -v "$(cd "$destination" && pwd):/backup:ro" \
  "$archive_image" tar -tzf /backup/rustfs.tar.gz >/dev/null
test -s "${destination}/commit-sha"

find "$backup_root" -mindepth 1 -maxdepth 1 -type d |
  sort -r |
  awk "NR > ${keep}" |
  while IFS= read -r expired; do
    rm -rf -- "$expired"
  done

restart_writes
trap - EXIT INT TERM
echo "Backup created: ${destination}"
