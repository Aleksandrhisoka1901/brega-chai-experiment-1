#!/bin/sh
set -eu

endpoint=${S3_ENDPOINT:?Set S3_ENDPOINT}
access_key=${S3_ACCESS_KEY_ID:?Set S3_ACCESS_KEY_ID}
secret_key=${S3_ACCESS_SECRET:?Set S3_ACCESS_SECRET}
bucket=${S3_BUCKET:?Set S3_BUCKET}

attempt=0
until mc alias set rustfs "$endpoint" "$access_key" "$secret_key" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "RustFS did not become ready" >&2
    exit 1
  fi
  sleep 2
done
mc mb --ignore-existing "rustfs/${bucket}"

cat > /tmp/public-read.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${bucket}/*"]
    }
  ]
}
EOF

mc anonymous set-json /tmp/public-read.json "rustfs/${bucket}"
applied_policy=$(mc anonymous get-json "rustfs/${bucket}")
case "$applied_policy" in
  *'"s3:GetObject"'*) ;;
  *)
    echo "Public object reads were not applied" >&2
    exit 1
    ;;
esac

case "$applied_policy" in
  *'"s3:ListBucket"'*)
    echo "Public bucket listing must remain disabled" >&2
    exit 1
    ;;
esac
