#!/bin/sh
set -eu

# Issue Let's Encrypt certs for the Timeweb experiment stack only.
# Never run this against bregalliance.ru.

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

project=${COMPOSE_PROJECT_NAME:-my-tea}
compose_base="-p $project -f docker-compose.yml"
compose_tls="$compose_base -f docker-compose.tls.yml"
compose_public="$compose_base -f docker-compose.public.yml"

read_env_value() {
  key=$1
  test -f .env || return 0
  awk -v key="$key" \
    'index($0, key "=") == 1 { print substr($0, length(key) + 2); exit }' \
    .env
}

: "${APP_DOMAIN:=$(read_env_value APP_DOMAIN)}"
: "${ADMIN_DOMAIN:=$(read_env_value ADMIN_DOMAIN)}"
: "${MEDIA_DOMAIN:=$(read_env_value MEDIA_DOMAIN)}"
: "${TLS_EMAIL:=$(read_env_value TLS_EMAIL)}"
: "${APP_DOMAIN:?Set APP_DOMAIN}"
: "${ADMIN_DOMAIN:?Set ADMIN_DOMAIN}"
: "${MEDIA_DOMAIN:?Set MEDIA_DOMAIN}"
: "${TLS_EMAIL:?Set TLS_EMAIL}"

running_nginx=$(docker ps --filter label=com.docker.compose.project="$project" --filter label=com.docker.compose.service=nginx --format '{{.ID}}')
if [ -n "$running_nginx" ]; then
  echo "Nginx is already running; use scripts/timeweb-tls-renew.sh instead" >&2
  exit 1
fi

docker compose $compose_tls up -d nginx-bootstrap
cleanup() {
  docker compose $compose_tls stop nginx-bootstrap
}
trap cleanup EXIT INT TERM

docker compose $compose_tls run --rm certbot certonly \
  --non-interactive \
  --agree-tos \
  --email "$TLS_EMAIL" \
  --webroot \
  --webroot-path /var/www/certbot \
  --cert-name "$APP_DOMAIN" \
  -d "$APP_DOMAIN" \
  -d "www.$APP_DOMAIN" \
  -d "$ADMIN_DOMAIN" \
  -d "$MEDIA_DOMAIN"

cleanup
trap - EXIT INT TERM

docker compose $compose_public up -d nginx
echo "Certificate created and Timeweb Nginx started."
