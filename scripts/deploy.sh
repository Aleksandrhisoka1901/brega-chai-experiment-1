#!/bin/sh
set -eu

: "${WEB_IMAGE:?Set WEB_IMAGE}"
: "${CMS_IMAGE:?Set CMS_IMAGE}"
: "${SMOKE_URL:?Set SMOKE_URL}"

compose_files="-f docker-compose.yml -f docker-compose.production.yml"
export COMPOSE_FILE=docker-compose.yml:docker-compose.production.yml

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

previous_web=$(docker inspect --format '{{.Config.Image}}' "$(docker compose $compose_files ps -q web)" 2>/dev/null || true)
previous_cms=$(docker inspect --format '{{.Config.Image}}' "$(docker compose $compose_files ps -q cms)" 2>/dev/null || true)

if [ -z "$previous_web" ] || [ -z "$previous_cms" ]; then
  initial_deploy=1
else
  initial_deploy=0
fi

if [ "$initial_deploy" -eq 0 ]; then
  ./scripts/backup.sh
else
  echo "Initial deploy detected; skipping backup because no application containers exist yet."
fi
docker compose $compose_files pull web cms
docker compose $compose_files up -d postgres rustfs rustfs-init
docker compose $compose_files up -d cms

if ! wait_service cms http://127.0.0.1:1337/admin; then
  failed=1
else
  docker compose $compose_files up -d web
  docker compose $compose_files up -d --force-recreate --no-deps nginx
  failed=0
fi

if [ "$failed" -eq 0 ] && ! wait_service web http://127.0.0.1:3000; then
  failed=1
fi

if [ "$failed" -eq 0 ] && ! curl --fail --silent --show-error --retry 10 \
  --retry-all-errors --retry-delay 3 "$SMOKE_URL" >/dev/null; then
  failed=1
fi

if [ "$failed" -eq 0 ]; then
  echo "Production rollout passed health and HTTP smoke checks."
  exit 0
fi

echo "Production healthcheck failed; restoring previous application images." >&2
if [ "$initial_deploy" -eq 1 ]; then
  docker compose $compose_files stop nginx web cms
  echo "Initial deploy failed; application containers stopped because no rollback target exists." >&2
  exit 1
fi

WEB_IMAGE=$previous_web CMS_IMAGE=$previous_cms \
  docker compose $compose_files up -d --no-deps cms web

wait_service cms http://127.0.0.1:1337/admin
wait_service web http://127.0.0.1:3000

echo "Application images rolled back; deploy remains failed." >&2
exit 1
