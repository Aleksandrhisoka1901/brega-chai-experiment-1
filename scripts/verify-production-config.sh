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
: "${POSTGRES_DB:=brega}"
: "${POSTGRES_USER:=brega}"
: "${POSTGRES_PASSWORD:=verification-only}"
: "${RUSTFS_IMAGE:=rustfs/rustfs:1.0.0-beta.11}"
: "${RUSTFS_ACCESS_KEY:=verification-only}"
: "${RUSTFS_SECRET_KEY:=verification-only}"
: "${RUSTFS_BUCKET:=storefront}"
: "${S3_CLIENT_IMAGE:=minio/mc:RELEASE.2025-08-13T08-35-41Z-cpuv1}"
: "${WEB_IMAGE:=registry.example.test/web:verification}"
: "${CMS_IMAGE:=registry.example.test/cms:verification}"
export APP_DOMAIN ADMIN_DOMAIN MEDIA_DOMAIN
export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
export RUSTFS_IMAGE RUSTFS_ACCESS_KEY RUSTFS_SECRET_KEY RUSTFS_BUCKET
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
