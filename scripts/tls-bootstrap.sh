#!/bin/sh
set -eu

compose_files="-f docker-compose.tls.yml"
: "${APP_DOMAIN:?Set APP_DOMAIN}"
: "${ADMIN_DOMAIN:?Set ADMIN_DOMAIN}"
: "${MEDIA_DOMAIN:?Set MEDIA_DOMAIN}"
: "${TLS_EMAIL:?Set TLS_EMAIL}"

running_nginx=$(docker ps --filter label=com.docker.compose.service=nginx --format '{{.ID}}')
if [ -n "$running_nginx" ]; then
  echo "Production Nginx is already running; use tls-renew.sh instead" >&2
  exit 1
fi

docker compose $compose_files up -d nginx-bootstrap
cleanup() {
  docker compose $compose_files stop nginx-bootstrap
}
trap cleanup EXIT INT TERM

docker compose $compose_files run --rm certbot certonly \
  --non-interactive \
  --agree-tos \
  --email "$TLS_EMAIL" \
  --webroot \
  --webroot-path /var/www/certbot \
  --cert-name "$APP_DOMAIN" \
  -d "$APP_DOMAIN" \
  -d "$ADMIN_DOMAIN" \
  -d "$MEDIA_DOMAIN"

cleanup
trap - EXIT INT TERM
echo "Certificate created. Start production Nginx with the production Compose stack."
