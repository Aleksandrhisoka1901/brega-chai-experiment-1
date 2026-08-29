#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

project=${COMPOSE_PROJECT_NAME:-my-tea}
compose_tls="-p $project -f docker-compose.yml -f docker-compose.tls.yml"

docker compose $compose_tls run --rm certbot renew \
  --non-interactive \
  --webroot \
  --webroot-path /var/www/certbot

nginx_container=$(docker ps \
  --filter label=com.docker.compose.project="$project" \
  --filter label=com.docker.compose.service=nginx \
  --format '{{.ID}}')
if [ -z "$nginx_container" ]; then
  echo "Timeweb Nginx container is not running" >&2
  exit 1
fi
docker kill --signal HUP "$nginx_container"
