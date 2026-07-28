#!/bin/sh
set -eu

backup_root=${BACKUP_ROOT:-./backups}
keep=${BACKUP_KEEP:-3}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="${backup_root}/${timestamp}"
archive_image=alpine:3.22.1

case "$keep" in
  ''|*[!0-9]*) echo "BACKUP_KEEP must be a positive integer" >&2; exit 1 ;;
  0) echo "BACKUP_KEEP must be greater than zero" >&2; exit 1 ;;
esac

mkdir -p "$destination"

restart_writes() {
  docker compose up -d rustfs rustfs-init cms web
}
trap restart_writes EXIT INT TERM

docker compose stop web cms rustfs

docker compose exec -T postgres pg_dump \
  --username="${POSTGRES_USER:?Set POSTGRES_USER}" \
  --dbname="${POSTGRES_DB:?Set POSTGRES_DB}" \
  --format=custom > "${destination}/postgres.dump"

rustfs_container=$(docker compose ps -aq rustfs)
test -n "$rustfs_container"
docker run --rm --volumes-from "$rustfs_container" \
  -v "$(cd "$destination" && pwd):/backup" \
  "$archive_image" tar -czf /backup/rustfs.tar.gz -C /data .

printf '%s\n' "${CI_COMMIT_SHA:-unknown}" > "${destination}/commit-sha"

find "$backup_root" -mindepth 1 -maxdepth 1 -type d |
  sort -r |
  awk "NR > ${keep}" |
  while IFS= read -r expired; do
    rm -rf -- "$expired"
  done

restart_writes
trap - EXIT INT TERM
echo "Backup created: ${destination}"
