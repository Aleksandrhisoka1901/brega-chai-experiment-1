#!/bin/sh
set -eu

compose_files="-f docker-compose.yml -f docker-compose.production.yml"
backup=${1:-}
archive_image=alpine:3.22.1

if [ -z "$backup" ] || [ ! -d "$backup" ]; then
  echo "Usage: RESTORE_CONFIRM=restore-production-data $0 <backup-directory>" >&2
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "restore-production-data" ]; then
  echo "Set RESTORE_CONFIRM=restore-production-data to allow destructive restore" >&2
  exit 1
fi

test -f "${backup}/postgres.dump"
test -f "${backup}/rustfs.tar.gz"

docker compose $compose_files stop web cms rustfs
docker compose $compose_files exec -T postgres sh -eu -c \
  'exec pg_restore --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists' \
  < "${backup}/postgres.dump"

rustfs_container=$(docker compose $compose_files ps -aq rustfs)
test -n "$rustfs_container"
docker run --rm --volumes-from "$rustfs_container" \
  -v "$(cd "$backup" && pwd):/backup:ro" \
  "$archive_image" sh -c 'find /data -mindepth 1 -delete && tar -xzf /backup/rustfs.tar.gz -C /data'

docker compose $compose_files up -d rustfs rustfs-init cms web
echo "Restore completed from: ${backup}"
