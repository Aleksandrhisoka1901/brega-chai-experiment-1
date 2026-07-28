#!/bin/sh
set -eu

compose_files="-f docker-compose.tls.yml"
docker compose $compose_files run --rm certbot renew \
  --non-interactive \
  --webroot \
  --webroot-path /var/www/certbot
nginx_container=$(docker ps --filter label=com.docker.compose.service=nginx --format '{{.ID}}')
if [ -z "$nginx_container" ]; then
  echo "Production Nginx container is not running" >&2
  exit 1
fi
docker kill --signal HUP "$nginx_container"
