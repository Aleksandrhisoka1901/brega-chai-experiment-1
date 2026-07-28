#!/bin/sh
set -eu

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

docker compose stop web cms rustfs
docker compose exec -T postgres pg_restore \
  --username="${POSTGRES_USER:?Set POSTGRES_USER}" \
  --dbname="${POSTGRES_DB:?Set POSTGRES_DB}" \
  --clean \
  --if-exists < "${backup}/postgres.dump"

rustfs_container=$(docker compose ps -aq rustfs)
test -n "$rustfs_container"
docker run --rm --volumes-from "$rustfs_container" \
  -v "$(cd "$backup" && pwd):/backup:ro" \
  "$archive_image" sh -c 'find /data -mindepth 1 -delete && tar -xzf /backup/rustfs.tar.gz -C /data'

docker compose up -d rustfs rustfs-init cms web
echo "Restore completed from: ${backup}"
