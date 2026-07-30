#!/usr/bin/env bash
set -Eeuo pipefail

PACKAGE="${1:-}"
[[ -n "$PACKAGE" && -f "$PACKAGE" ]] || {
  echo 'Cách dùng: smoke-ubuntu20.sh <file.deb>' >&2
  exit 2
}

[[ -r /etc/os-release ]] || exit 1
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == ubuntu && "${VERSION_ID:-}" == '20.04' ]] || {
  echo 'Smoke test này bắt buộc chạy trong Ubuntu 20.04.' >&2
  exit 1
}

TEMPORARY="$(mktemp -d)"
PAYLOAD="$TEMPORARY/payload"
DATA="$TEMPORARY/data"
PID=''

cleanup() {
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -rf "$TEMPORARY"
}
trap cleanup EXIT INT TERM

mkdir -p "$PAYLOAD" "$DATA/backups" "$DATA/data" "$DATA/logs" artifacts
dpkg-deb --extract "$PACKAGE" "$PAYLOAD"
APP="$PAYLOAD/opt/mikrotik-manager-enterprise"
NODE="$APP/runtime/node"
[[ -x "$NODE" && -f "$APP/dist/server.js" && -f "$APP/prisma/schema.sqlite.sql" ]]
[[ -f "$APP/prisma/schema.postgresql.prisma" && -f "$APP/prisma-client-postgresql/index.js" ]]
[[ -f "$APP/prisma/schema.mysql.prisma" && -f "$APP/prisma-client-mysql/index.js" ]]
[[ -f "$APP/node_modules/prisma/build/index.js" ]]

ldd "$NODE" | tee artifacts/ubuntu20-node-ldd.txt
if ldd "$NODE" | grep -q 'not found'; then
  echo 'Node runtime còn thiếu shared library trên Ubuntu 20.04.' >&2
  exit 1
fi
"$NODE" --version | tee artifacts/ubuntu20-node-version.txt

export NODE_ENV=production
export APP_NAME=mikrotik-manager-enterprise
APP_VERSION="$(tr -d '[:space:]' < "$APP/VERSION")"
export APP_VERSION
export SERVER_HOST=127.0.0.1
export SERVER_PORT=3100
export FRONTEND_HOST=127.0.0.1
export FRONTEND_PORT=3180
export DATABASE_URL="file:$DATA/data/mme.db"
export JWT_SECRET=ubuntu20-smoke-jwt-secret-2026-000000000000000000
export ENCRYPTION_KEY=ubuntu20-smoke-encryption-key-2026
export DEFAULT_ADMIN_EMAIL=ubuntu20-smoke@example.com
export DEFAULT_ADMIN_PASSWORD=MME-Ubuntu20-Smoke-Password-2026
export SYSLOG_ENABLED=true
export SYSLOG_UDP_ENABLED=true
export SYSLOG_TCP_ENABLED=true
export SYSLOG_BIND_ADDRESS=127.0.0.1
export SYSLOG_PORT=15514
export SYSLOG_RETENTION_DAYS=30
export SYSLOG_MAX_RECORDS=500000
export SYSLOG_ACCEPT_UNMATCHED=true
export BACKUP_STORAGE_PATH="$DATA/backups"
export WEB_DIST_PATH="$APP/web"
export SQLITE_SCHEMA_SQL="$APP/prisma/schema.sqlite.sql"
export LOG_LEVEL=info

DATABASE_URL='mysql://mme:probe@127.0.0.1:3306/mme' \
  "$NODE" "$APP/node_modules/prisma/build/index.js" validate \
  --schema "$APP/prisma/schema.mysql.prisma" \
  | tee artifacts/ubuntu20-mysql-schema-validate.log

"$NODE" "$APP/dist/scripts/setup-native.js" | tee artifacts/ubuntu20-setup-native.log
(
  cd "$APP"
  exec "$NODE" dist/server.js
) > artifacts/ubuntu20-server.log 2>&1 &
PID=$!

for _ in $(seq 1 45); do
  if curl --fail --silent --show-error http://127.0.0.1:3100/ready \
    > artifacts/ubuntu20-ready.json; then
    break
  fi
  sleep 2
done

curl --fail --silent --show-error http://127.0.0.1:3100/ready \
  | tee artifacts/ubuntu20-ready.json
grep -q '"status":"ready"' artifacts/ubuntu20-ready.json
grep -q '"database":true' artifacts/ubuntu20-ready.json

curl --fail --silent --show-error http://127.0.0.1:3180/ready \
  | tee artifacts/ubuntu20-frontend-ready.json
curl --fail --silent --show-error http://127.0.0.1:3180/topology \
  | grep -q '<div id="root"></div>'
"$NODE" packaging/smoke-frontend-assets.mjs http://127.0.0.1:3100 \
  | tee artifacts/ubuntu20-backend-assets.json
"$NODE" packaging/smoke-frontend-assets.mjs http://127.0.0.1:3180 \
  | tee artifacts/ubuntu20-frontend-assets.json
MME_SMOKE_EMAIL="$DEFAULT_ADMIN_EMAIL" MME_SMOKE_PASSWORD="$DEFAULT_ADMIN_PASSWORD" \
  "$NODE" packaging/smoke-routeros-features.mjs http://127.0.0.1:3100 \
  | tee artifacts/ubuntu20-routeros-features.json
MME_SMOKE_EMAIL="$DEFAULT_ADMIN_EMAIL" MME_SMOKE_PASSWORD="$DEFAULT_ADMIN_PASSWORD" \
  MME_SMOKE_SYSLOG_HOST=127.0.0.1 MME_SMOKE_SYSLOG_PORT="$SYSLOG_PORT" \
  "$NODE" packaging/smoke-syslog.mjs http://127.0.0.1:3100 \
  | tee artifacts/ubuntu20-syslog.json

curl --fail --silent --show-error http://127.0.0.1:3100/api/v1/topology \
  | tee artifacts/ubuntu20-topology.json
"$NODE" -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync('artifacts/ubuntu20-topology.json'));if(!x.success||x.data.summary.confirmedLinks===undefined||x.data.inventoryScheduler.intervalMs!==1800000)process.exit(1)"

REPORT_STATUS="$(curl --silent --output artifacts/ubuntu20-report-send-guard.json \
  --write-out '%{http_code}' --request POST --header 'Content-Type: application/json' \
  --data '{}' http://127.0.0.1:3100/api/v1/reports/schedules/ci-smoke/send)"
[[ "$REPORT_STATUS" == 404 ]]
[[ -s "$DATA/data/mme.db" ]]

echo 'Ubuntu 20.04 runtime smoke test: PASS' | tee artifacts/ubuntu20-smoke-result.txt
