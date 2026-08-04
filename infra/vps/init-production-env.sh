#!/bin/sh
set -eu

: "${APP_DOMAIN:?Set APP_DOMAIN}"
: "${ADMIN_DOMAIN:?Set ADMIN_DOMAIN}"
: "${MEDIA_DOMAIN:?Set MEDIA_DOMAIN}"
: "${TLS_EMAIL:?Set TLS_EMAIL}"
: "${STRAPI_ADMIN_EMAIL:?Set STRAPI_ADMIN_EMAIL}"

target=${PRODUCTION_ENV_FILE:-.env}

if [ -e "$target" ]; then
  echo "Refusing to overwrite existing production env: $target" >&2
  exit 1
fi

command -v openssl >/dev/null 2>&1 || {
  echo "openssl is required" >&2
  exit 1
}

random_secret() {
  openssl rand -hex 32
}

postgres_password=$(random_secret)
rustfs_access_key="brega-$(openssl rand -hex 8)"
rustfs_secret_key=$(random_secret)
app_keys="$(random_secret),$(random_secret),$(random_secret),$(random_secret)"

umask 077
temporary=$(mktemp "${target}.tmp.XXXXXX")
cleanup() {
  rm -f "$temporary"
}
trap cleanup EXIT INT TERM

{
  printf '%s\n' \
    'COMPOSE_PROJECT_NAME=brega-chai' \
    'NODE_ENV=production' \
    'SEED_ALLOWED=false' \
    '' \
    'POSTGRES_DB=brega_chai' \
    'POSTGRES_USER=brega_chai' \
    "POSTGRES_PASSWORD=$postgres_password" \
    'DATABASE_HOST=postgres' \
    'DATABASE_PORT=5432' \
    'DATABASE_NAME=brega_chai' \
    'DATABASE_USERNAME=brega_chai' \
    "DATABASE_PASSWORD=$postgres_password" \
    'DATABASE_SSL=false' \
    '' \
    'HOST=0.0.0.0' \
    'PORT=1337' \
    "STRAPI_URL=https://$ADMIN_DOMAIN" \
    "APP_KEYS=$app_keys" \
    "API_TOKEN_SALT=$(random_secret)" \
    "ADMIN_JWT_SECRET=$(random_secret)" \
    "TRANSFER_TOKEN_SALT=$(random_secret)" \
    "JWT_SECRET=$(random_secret)" \
    "ENCRYPTION_KEY=$(random_secret)" \
    '' \
    'SMTP_HOST=localhost' \
    'SMTP_PORT=1025' \
    'SMTP_SECURE=false' \
    'SMTP_USERNAME=' \
    'SMTP_PASSWORD=' \
    "SMTP_FROM=\"Brega <no-reply@$APP_DOMAIN>\"" \
    "SMTP_REPLY_TO=$STRAPI_ADMIN_EMAIL" \
    'SMTP_CONNECTION_TIMEOUT_MS=5000' \
    '' \
    "SITE_URL=https://$APP_DOMAIN" \
    'CMS_INTERNAL_URL=http://cms:1337' \
    "NEXT_PUBLIC_CMS_URL=https://$ADMIN_DOMAIN" \
    "NEXT_PUBLIC_MEDIA_URL=https://$MEDIA_DOMAIN" \
    "CHECKOUT_FORM_SECRET=$(random_secret)" \
    'STRAPI_ORDER_TOKEN=' \
    '' \
    'CACHE_REVALIDATION_URL=http://web:3000/api/revalidate' \
    "CACHE_REVALIDATION_SECRET=$(random_secret)" \
    'CACHE_REVALIDATION_TIMEOUT_MS=3000' \
    '' \
    'RUSTFS_IMAGE=rustfs/rustfs:1.0.0-beta.11' \
    'S3_CLIENT_IMAGE=minio/mc:RELEASE.2025-08-13T08-35-41Z-cpuv1' \
    "RUSTFS_ACCESS_KEY=$rustfs_access_key" \
    "RUSTFS_SECRET_KEY=$rustfs_secret_key" \
    'RUSTFS_BUCKET=storefront' \
    'UPLOAD_PROVIDER=aws-s3' \
    'S3_ENDPOINT=http://rustfs:9000' \
    'S3_REGION=us-east-1' \
    'S3_BUCKET=storefront' \
    "S3_ACCESS_KEY_ID=$rustfs_access_key" \
    "S3_ACCESS_SECRET=$rustfs_secret_key" \
    "MEDIA_PUBLIC_URL=https://$MEDIA_DOMAIN" \
    '' \
    "APP_DOMAIN=$APP_DOMAIN" \
    "ADMIN_DOMAIN=$ADMIN_DOMAIN" \
    "MEDIA_DOMAIN=$MEDIA_DOMAIN" \
    "TLS_EMAIL=$TLS_EMAIL" \
    '' \
    'BACKUP_ROOT=./backups' \
    'BACKUP_KEEP=3' \
    '' \
    'WEB_IMAGE=' \
    'CMS_IMAGE=' \
    'SMOKE_URL='
} >"$temporary"

chmod 600 "$temporary"
mv "$temporary" "$target"
trap - EXIT INT TERM

echo "Production env created: $target"
echo "SMTP and STRAPI_ORDER_TOKEN remain intentionally pending."
