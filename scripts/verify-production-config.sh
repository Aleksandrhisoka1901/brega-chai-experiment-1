#!/bin/sh
set -eu

command -v docker >/dev/null 2>&1 || {
  echo "docker CLI is required" >&2
  exit 1
}
command -v jq >/dev/null 2>&1 || {
  echo "jq is required" >&2
  exit 1
}

: "${APP_DOMAIN:=shop.example.test}"
: "${ADMIN_DOMAIN:=admin.example.test}"
: "${MEDIA_DOMAIN:=media.example.test}"
: "${SITE_URL:=https://shop.example.test}"
: "${CMS_INTERNAL_URL:=http://cms:1337}"
: "${NEXT_PUBLIC_CMS_URL:=https://admin.example.test}"
: "${NEXT_PUBLIC_MEDIA_URL:=https://media.example.test}"
: "${CHECKOUT_FORM_SECRET:=verification-only-checkout}"
: "${STRAPI_ORDER_TOKEN:=verification-only-order-token}"
: "${CACHE_REVALIDATION_URL:=http://web:3000/api/revalidate}"
: "${CACHE_REVALIDATION_SECRET:=verification-only-revalidation}"
: "${CACHE_REVALIDATION_TIMEOUT_MS:=3000}"
: "${POSTGRES_DB:=brega}"
: "${POSTGRES_USER:=brega}"
: "${POSTGRES_PASSWORD:=verification-only}"
: "${DATABASE_HOST:=postgres}"
: "${DATABASE_PORT:=5432}"
: "${DATABASE_NAME:=brega}"
: "${DATABASE_USERNAME:=brega}"
: "${DATABASE_PASSWORD:=verification-only}"
: "${HOST:=0.0.0.0}"
: "${PORT:=1337}"
: "${STRAPI_URL:=https://admin.example.test}"
: "${APP_KEYS:=verification-app-key-1,verification-app-key-2}"
: "${API_TOKEN_SALT:=verification-only-api-token-salt}"
: "${ADMIN_JWT_SECRET:=verification-only-admin-jwt}"
: "${TRANSFER_TOKEN_SALT:=verification-only-transfer-token-salt}"
: "${JWT_SECRET:=verification-only-jwt}"
: "${ENCRYPTION_KEY:=verification-only-encryption-key}"
: "${EMAIL_PROVIDER:=mailgun}"
: "${EMAIL_FROM:=Brega <no-reply@shop.example.test>}"
: "${EMAIL_REPLY_TO:=operator@shop.example.test}"
: "${MAILGUN_API_KEY:=verification-only-mailgun}"
: "${MAILGUN_DOMAIN:=mail.example.test}"
: "${MAILGUN_URL:=https://api.mailgun.net}"
: "${SMTP_HOST:=localhost}"
: "${SMTP_PORT:=1025}"
: "${SMTP_SECURE:=false}"
: "${SMTP_USERNAME:=}"
: "${SMTP_PASSWORD:=}"
: "${SMTP_CONNECTION_TIMEOUT_MS:=5000}"
: "${RUSTFS_IMAGE:=rustfs/rustfs:1.0.0-beta.11}"
: "${RUSTFS_ACCESS_KEY:=verification-only}"
: "${RUSTFS_SECRET_KEY:=verification-only}"
: "${RUSTFS_BUCKET:=storefront}"
: "${S3_CLIENT_IMAGE:=minio/mc:RELEASE.2025-08-13T08-35-41Z-cpuv1}"
: "${UPLOAD_PROVIDER:=aws-s3}"
: "${S3_ENDPOINT:=http://rustfs:9000}"
: "${S3_REGION:=us-east-1}"
: "${S3_BUCKET:=storefront}"
: "${S3_ACCESS_KEY_ID:=verification-only}"
: "${S3_ACCESS_SECRET:=verification-only}"
: "${MEDIA_PUBLIC_URL:=https://media.example.test}"
: "${WEB_IMAGE:=registry.example.test/web:verification}"
: "${CMS_IMAGE:=registry.example.test/cms:verification}"
export APP_DOMAIN ADMIN_DOMAIN MEDIA_DOMAIN
export SITE_URL CMS_INTERNAL_URL NEXT_PUBLIC_CMS_URL NEXT_PUBLIC_MEDIA_URL
export CHECKOUT_FORM_SECRET STRAPI_ORDER_TOKEN
export CACHE_REVALIDATION_URL CACHE_REVALIDATION_SECRET
export CACHE_REVALIDATION_TIMEOUT_MS
export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
export DATABASE_HOST DATABASE_PORT DATABASE_NAME DATABASE_USERNAME
export DATABASE_PASSWORD HOST PORT STRAPI_URL
export APP_KEYS API_TOKEN_SALT ADMIN_JWT_SECRET TRANSFER_TOKEN_SALT
export JWT_SECRET ENCRYPTION_KEY
export EMAIL_PROVIDER EMAIL_FROM EMAIL_REPLY_TO
export MAILGUN_API_KEY MAILGUN_DOMAIN MAILGUN_URL
export SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USERNAME SMTP_PASSWORD
export SMTP_CONNECTION_TIMEOUT_MS
export RUSTFS_IMAGE RUSTFS_ACCESS_KEY RUSTFS_SECRET_KEY RUSTFS_BUCKET
export UPLOAD_PROVIDER S3_ENDPOINT S3_REGION S3_BUCKET
export S3_ACCESS_KEY_ID S3_ACCESS_SECRET MEDIA_PUBLIC_URL
export S3_CLIENT_IMAGE WEB_IMAGE CMS_IMAGE

config_file=$(mktemp)
cleanup() {
  rm -f "$config_file"
}
trap cleanup EXIT INT TERM

docker compose \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  config --format json >"$config_file"

jq -e '
  . as $cfg |

  def has_dependency($service; $dependency):
    ($cfg.services[$service].depends_on // {} | has($dependency));

  (has_dependency("web"; "workspace-dependencies") | not) and
  (has_dependency("cms"; "workspace-dependencies") | not) and
  ($cfg.services.web.build == null) and
  ($cfg.services.cms.build == null) and
  (($cfg.services.web.env_file // []) | length == 0) and
  (($cfg.services.cms.env_file // []) | length == 0) and
  ([
    "SITE_URL",
    "CMS_INTERNAL_URL",
    "NEXT_PUBLIC_CMS_URL",
    "NEXT_PUBLIC_MEDIA_URL",
    "CHECKOUT_FORM_SECRET",
    "STRAPI_ORDER_TOKEN",
    "CACHE_REVALIDATION_SECRET"
  ] | all(. as $key | $cfg.services.web.environment | has($key))) and
  ([
    "DATABASE_PASSWORD",
    "POSTGRES_PASSWORD",
    "APP_KEYS",
    "API_TOKEN_SALT",
    "ADMIN_JWT_SECRET",
    "TRANSFER_TOKEN_SALT",
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "MAILGUN_API_KEY",
    "SMTP_PASSWORD",
    "RUSTFS_ACCESS_KEY",
    "RUSTFS_SECRET_KEY",
    "S3_ACCESS_KEY_ID",
    "S3_ACCESS_SECRET"
  ] | all(. as $key | $cfg.services.web.environment | has($key) | not)) and
  ([
    "APP_KEYS",
    "DATABASE_PASSWORD",
    "CACHE_REVALIDATION_SECRET",
    "S3_ACCESS_KEY_ID",
    "S3_ACCESS_SECRET"
  ] | all(. as $key | $cfg.services.cms.environment | has($key))) and
  ([
    "POSTGRES_PASSWORD",
    "CHECKOUT_FORM_SECRET",
    "STRAPI_ORDER_TOKEN",
    "RUSTFS_ACCESS_KEY",
    "RUSTFS_SECRET_KEY"
  ] | all(. as $key | $cfg.services.cms.environment | has($key) | not)) and
  ($cfg.services.web.healthcheck != null) and
  (["web", "cms", "postgres", "rustfs", "nginx"] | all(
    . as $service |
    $cfg.services[$service].logging.driver == "json-file" and
    $cfg.services[$service].logging.options["max-size"] == "10m" and
    $cfg.services[$service].logging.options["max-file"] == "3"
  )) and
  ([
    $cfg.services |
    to_entries[] |
    .key as $service |
    (.value.ports // [])[] |
    {service: $service, published: (.published | tostring)}
  ] == [
    {service: "nginx", published: "80"},
    {service: "nginx", published: "443"}
  ])
' "$config_file" >/dev/null || {
  echo "Production Compose configuration failed safety checks." >&2
  exit 1
}

echo "Production Compose configuration passed safety checks."
