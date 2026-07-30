#!/usr/bin/env bash
set -Eeuo pipefail

MME_PACKAGE_VERSION="${1:-}"
MME_VERSION_PATTERN='^[0-9]+\.[0-9]+\.[0-9]+([+~.-][0-9A-Za-z.+~-]+)?$'
[[ "$MME_PACKAGE_VERSION" =~ $MME_VERSION_PATTERN ]] || {
  echo 'Cách dùng: build-deb-ubuntu20.sh <version>' >&2
  exit 2
}

if [[ -r /etc/os-release ]]; then
  # Đọc thông tin OS trong subshell để VERSION của /etc/os-release không thể
  # ghi đè phiên bản MME. Ubuntu 20.04 định nghĩa VERSION="20.04.6 LTS (...)".
  read_os_release_value() (
    local key="$1"
    # shellcheck disable=SC1091
    . /etc/os-release
    printf '%s' "${!key:-}"
  )
  OS_ID="$(read_os_release_value ID)"
  OS_VERSION_ID="$(read_os_release_value VERSION_ID)"
  OS_PRETTY_NAME="$(read_os_release_value PRETTY_NAME)"
  [[ "$OS_ID" == ubuntu && "$OS_VERSION_ID" == '20.04' ]] || {
    echo "Gói phát hành phải được build trong Ubuntu 20.04; hiện tại: $OS_PRETTY_NAME." >&2
    exit 1
  }
fi

ROOT="artifacts/deb-root"
APP="$ROOT/opt/mikrotik-manager-enterprise"
PACKAGE="artifacts/mikrotik-manager-enterprise_${MME_PACKAGE_VERSION}_amd64.deb"

rm -rf "$ROOT" "$PACKAGE"
mkdir -p \
  "$APP" \
  "$ROOT/usr/local/bin" \
  "$ROOT/lib/systemd/system" \
  "$ROOT/DEBIAN" \
  artifacts

pnpm install --frozen-lockfile
# Quality gate sử dụng schema PostgreSQL chuẩn. Payload phát hành tạo client
# riêng cho SQLite, PostgreSQL và MariaDB/MySQL.
pnpm --filter @mme/server prisma:generate
pnpm lint
pnpm typecheck
pnpm test

export DATABASE_URL='file:./mme-build.db'
pnpm --filter @mme/server prisma:generate:sqlite
pnpm --filter @mme/server prisma:sql:sqlite
pnpm --filter @mme/web build
pnpm --filter @mme/routeros-core build
pnpm --filter @mme/routeros-sdk build
pnpm --filter @mme/server build
pnpm --config.node-linker=hoisted --filter @mme/server deploy --legacy --prod "$APP"

PRISMA_CLI="$APP/node_modules/prisma/build/index.js"
[[ -f "$PRISMA_CLI" ]] || {
  echo 'Không tìm thấy Prisma CLI trong production payload hoisted.' >&2
  exit 1
}

# Sinh client với engine OpenSSL 1.1 và OpenSSL 3 để cùng
# một DEB chạy được trên Ubuntu 20.04, 22.04 và 24.04. Chỉ sửa schema trong payload
# Linux, không chạm schema hoặc payload Windows.
sed -i '/provider = "prisma-client-js"/a\  binaryTargets = ["debian-openssl-1.1.x", "debian-openssl-3.0.x"]' \
  "$APP/prisma/schema.sqlite.prisma"
node "$PRISMA_CLI" generate --schema "$APP/prisma/schema.sqlite.prisma"

CLIENT_DIR="$APP/node_modules/.prisma/client"
find "$CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-1.1.x*' -print -quit | grep -q . || {
  echo 'Payload thiếu Prisma engine dành cho Ubuntu 20.04/OpenSSL 1.1.' >&2
  exit 1
}
find "$CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-3.0.x*' -print -quit | grep -q . || {
  echo 'Payload thiếu Prisma engine dành cho Ubuntu 22.04/24.04/OpenSSL 3.' >&2
  exit 1
}

# Sinh Prisma Client PostgreSQL độc lập. Client SQLite mặc định vẫn nằm trong
# node_modules/@prisma/client, nên Windows và chế độ SQLite không bị thay đổi.
cp "$APP/prisma/schema.prisma" "$APP/prisma/schema.postgresql.prisma"
sed -i '/provider = "prisma-client-js"/a\  output = "../prisma-client-postgresql"' \
  "$APP/prisma/schema.postgresql.prisma"
sed -i '/output = "..\/prisma-client-postgresql"/a\  binaryTargets = ["debian-openssl-1.1.x", "debian-openssl-3.0.x"]' \
  "$APP/prisma/schema.postgresql.prisma"
node "$PRISMA_CLI" generate --schema "$APP/prisma/schema.postgresql.prisma"

POSTGRES_CLIENT_DIR="$APP/prisma-client-postgresql"
[[ -f "$POSTGRES_CLIENT_DIR/index.js" ]] || {
  echo 'Payload thiếu Prisma Client PostgreSQL.' >&2
  exit 1
}
find "$POSTGRES_CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-1.1.x*' -print -quit | grep -q . || {
  echo 'PostgreSQL client thiếu engine Ubuntu 20.04/OpenSSL 1.1.' >&2
  exit 1
}
find "$POSTGRES_CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-3.0.x*' -print -quit | grep -q . || {
  echo 'PostgreSQL client thiếu engine Ubuntu 22.04/24.04/OpenSSL 3.' >&2
  exit 1
}

# MariaDB and MySQL use Prisma's mysql connector and a dedicated generated
# client so SQLite and PostgreSQL remain isolated.
cp "$APP/prisma/schema.prisma" "$APP/prisma/schema.mysql.prisma"
sed -i 's/provider = "postgresql"/provider = "mysql"/' "$APP/prisma/schema.mysql.prisma"
sed -i '/provider = "prisma-client-js"/a\  output = "../prisma-client-mysql"' \
  "$APP/prisma/schema.mysql.prisma"
sed -i '/output = "..\/prisma-client-mysql"/a\  binaryTargets = ["debian-openssl-1.1.x", "debian-openssl-3.0.x"]' \
  "$APP/prisma/schema.mysql.prisma"
node "$PRISMA_CLI" generate --schema "$APP/prisma/schema.mysql.prisma"

MYSQL_CLIENT_DIR="$APP/prisma-client-mysql"
[[ -f "$MYSQL_CLIENT_DIR/index.js" ]] || {
  echo 'Payload thiếu Prisma Client MariaDB/MySQL.' >&2
  exit 1
}
find "$MYSQL_CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-1.1.x*' -print -quit | grep -q . || {
  echo 'MariaDB/MySQL client thiếu engine Ubuntu 20.04/OpenSSL 1.1.' >&2
  exit 1
}
find "$MYSQL_CLIENT_DIR" -maxdepth 1 -name '*debian-openssl-3.0.x*' -print -quit | grep -q . || {
  echo 'MariaDB/MySQL client thiếu engine Ubuntu 22.04/24.04/OpenSSL 3.' >&2
  exit 1
}

cp -a apps/web/dist "$APP/web"
install -d -m 0755 "$APP/runtime"
install -m 0755 "$(command -v node)" "$APP/runtime/node"
printf '%s\n' "$MME_PACKAGE_VERSION" > "$APP/VERSION"
cp project-docs/deployment/HUONG-DAN-CAI-DAT-LINUX.md "$APP/HUONG-DAN-CAI-DAT-LINUX.md"
cp project-docs/deployment/HUONG-DAN-DATABASE-LINUX-5.6.2.md "$APP/HUONG-DAN-DATABASE-LINUX-5.6.2.md"
cp project-docs/deployment/HUONG-DAN-KIEM-TRA-TINH-NANG-LINUX-5.7.0.md \
  "$APP/HUONG-DAN-KIEM-TRA-TINH-NANG-LINUX-5.7.0.md"
cp project-docs/deployment/HUONG-DAN-SYSLOG-5.8.0.md \
  "$APP/HUONG-DAN-SYSLOG-5.8.0.md"

install -m 0755 packaging/linux/mme-control "$ROOT/usr/local/bin/mme-control"
install -m 0755 packaging/linux/mme-ubuntu-install.sh "$ROOT/usr/local/bin/mme-ubuntu-install"
install -m 0644 packaging/linux/mme.service "$ROOT/lib/systemd/system/mme.service"

cat > "$ROOT/DEBIAN/control" <<EOF
Package: mikrotik-manager-enterprise
Version: $MME_PACKAGE_VERSION
Section: admin
Priority: optional
Architecture: amd64
Depends: ca-certificates, curl, iproute2, iputils-ping, openssl, procps, systemd
Maintainer: MikroTik Manager Enterprise Community
Description: Enterprise MikroTik controller and monitoring platform
 SQLite, PostgreSQL, or MariaDB/MySQL build for Ubuntu Server 20.04 or newer.
EOF

cat > "$ROOT/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if [ -d /run/systemd/system ]; then
  systemctl daemon-reload
  systemctl enable mme.service
fi
echo 'Package extraction completed. Continue with mme-ubuntu-install to configure and start MME.'
EOF

cat > "$ROOT/DEBIAN/prerm" <<'EOF'
#!/bin/sh
set -e
if [ "$1" = remove ] && [ -d /run/systemd/system ]; then
  systemctl disable --now mme.service 2>/dev/null || true
fi
EOF

cat > "$ROOT/DEBIAN/postrm" <<'EOF'
#!/bin/sh
set -e
if [ -d /run/systemd/system ]; then
  systemctl daemon-reload 2>/dev/null || true
fi
EOF

chmod 0755 "$ROOT/DEBIAN/postinst" "$ROOT/DEBIAN/prerm" "$ROOT/DEBIAN/postrm"

# Chặn metadata lỗi trước khi dpkg-deb chạy, kể cả khi môi trường build có các
# biến tên chung như VERSION. Đây là quality gate độc lập với kiểm tra đầu vào.
CONTROL_VERSION="$(sed -n 's/^Version:[[:space:]]*//p' "$ROOT/DEBIAN/control")"
[[ "$CONTROL_VERSION" == "$MME_PACKAGE_VERSION" && "$CONTROL_VERSION" =~ $MME_VERSION_PATTERN ]] || {
  echo "Version DEB không hợp lệ: ${CONTROL_VERSION:-empty}" >&2
  exit 1
}

dpkg-deb --build --root-owner-group "$ROOT" "$PACKAGE"
dpkg-deb --info "$PACKAGE"
BUILT_VERSION="$(dpkg-deb --field "$PACKAGE" Version)"
[[ "$BUILT_VERSION" == "$MME_PACKAGE_VERSION" ]] || {
  echo "Version DEB sau build không khớp: expected=$MME_PACKAGE_VERSION actual=$BUILT_VERSION" >&2
  exit 1
}
cp packaging/linux/mme-ubuntu-install.sh artifacts/mme-ubuntu-install.sh
chmod 0755 artifacts/mme-ubuntu-install.sh
(cd artifacts && sha256sum "$(basename "$PACKAGE")" > SHA256SUMS-LINUX.txt)

NODE_GLIBC="$("$APP/runtime/node" -p "process.report.getReport().header.glibcVersionRuntime || 'unknown'")"
{
  echo "build_os=${OS_PRETTY_NAME:-unknown}"
  echo "package_version=$MME_PACKAGE_VERSION"
  echo "node_version=$("$APP/runtime/node" --version)"
  echo "node_glibc=$NODE_GLIBC"
  echo 'database_engines=sqlite,postgresql,mariadb,mysql'
  echo 'prisma_targets=debian-openssl-1.1.x,debian-openssl-3.0.x'
} | tee artifacts/ubuntu20-build-runtime.txt
