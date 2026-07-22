#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-install}"
DEB_PATH="${2:-}"
CHECKSUM_PATH="${3:-}"
BACKEND_PORT="${MME_BACKEND_PORT:-}"
FRONTEND_PORT="${MME_FRONTEND_PORT:-}"
DATABASE_ENGINE="${MME_DATABASE_ENGINE:-}"
DATABASE_NAME="${MME_DATABASE_NAME:-mme}"
DATABASE_URL_OVERRIDE="${MME_DATABASE_URL:-}"
REJECT_EXISTING_SQLITE=0
PROVISION_LOCAL_POSTGRESQL=0
USE_CONFIGURED_POSTGRESQL=0
ALLOW_EXISTING_POSTGRESQL="${MME_ALLOW_EXISTING_POSTGRESQL:-0}"
CONFIG_FILE=/etc/mikrotik-manager-enterprise/mme.env
DATA_DIR=/var/lib/mikrotik-manager-enterprise

usage() {
  cat <<'EOF'
Cài mới hoặc nâng cấp (100% CLI):
  sudo bash mme-ubuntu-install.sh install  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]
  sudo bash mme-ubuntu-install.sh upgrade  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]

Quản trị:
  sudo bash mme-ubuntu-install.sh uninstall
  bash mme-ubuntu-install.sh status
  bash mme-ubuntu-install.sh health

Không tương tác/automation:
  MME_BACKEND_PORT=3000 MME_FRONTEND_PORT=8080 MME_DATABASE_ENGINE=sqlite sudo -E bash mme-ubuntu-install.sh install ...
  MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME=mme sudo -E bash mme-ubuntu-install.sh install ...
EOF
}

fail() {
  echo "LỖI: $*" >&2
  exit 1
}

require_root() {
  [[ ${EUID:-$(id -u)} -eq 0 ]] || fail 'Hãy chạy lệnh cài đặt bằng sudo.'
}

version_at_least() {
  [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" == "$2" ]]
}

is_interactive() {
  [[ -t 0 && -t 1 && "${MME_NONINTERACTIVE:-0}" != 1 ]]
}

valid_port() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] && (( 1 <= $1 && $1 <= 65535 ))
}

prompt_yes_no() {
  local prompt="$1"
  local default="${2:-yes}"
  local answer
  if [[ "$default" == yes ]]; then
    read -r -p "$prompt [Y/n]: " answer
    [[ -z "$answer" || "$answer" =~ ^[Yy]([Ee][Ss])?$ ]]
  else
    read -r -p "$prompt [y/N]: " answer
    [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]]
  fi
}

read_config_value() {
  local key="$1"
  [[ -r "$CONFIG_FILE" ]] || return 0
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$CONFIG_FILE"
}

configure_ports() {
  local configured_backend configured_frontend answer
  configured_backend="$(read_config_value SERVER_PORT)"
  configured_frontend="$(read_config_value FRONTEND_PORT)"

  [[ -z "$BACKEND_PORT" ]] || valid_port "$BACKEND_PORT" ||
    fail "Cổng backend không hợp lệ: $BACKEND_PORT"
  [[ -z "$FRONTEND_PORT" ]] || valid_port "$FRONTEND_PORT" ||
    fail "Cổng frontend không hợp lệ: $FRONTEND_PORT"
  if ! valid_port "$BACKEND_PORT"; then
    valid_port "$configured_backend" && BACKEND_PORT="$configured_backend" || BACKEND_PORT=3000
  fi
  if ! valid_port "$FRONTEND_PORT"; then
    valid_port "$configured_frontend" && FRONTEND_PORT="$configured_frontend" || FRONTEND_PORT="$BACKEND_PORT"
  fi

  if is_interactive; then
    echo
    if [[ -f "$CONFIG_FILE" ]]; then
      echo "Cổng hiện tại: backend $BACKEND_PORT · frontend $FRONTEND_PORT."
      answer='Bạn có muốn thay đổi cổng trong lần cài đè này?'
    else
      echo 'Cấu hình cổng MME (bỏ qua để dùng mặc định chung cổng 3000).'
      answer='Bạn có muốn đặt cổng backend/frontend riêng?'
    fi
    if prompt_yes_no "$answer" no; then
      read -r -p "Cổng backend/API [$BACKEND_PORT]: " answer
      [[ -n "$answer" ]] && BACKEND_PORT="$answer"
      valid_port "$BACKEND_PORT" || fail "Cổng backend không hợp lệ: $BACKEND_PORT"
      read -r -p "Cổng frontend/dashboard [$FRONTEND_PORT]: " answer
      [[ -n "$answer" ]] && FRONTEND_PORT="$answer"
      valid_port "$FRONTEND_PORT" || fail "Cổng frontend không hợp lệ: $FRONTEND_PORT"
    fi
  fi

  valid_port "$BACKEND_PORT" || fail "Cổng backend không hợp lệ: $BACKEND_PORT"
  valid_port "$FRONTEND_PORT" || fail "Cổng frontend không hợp lệ: $FRONTEND_PORT"
  export MME_BACKEND_PORT="$BACKEND_PORT" MME_FRONTEND_PORT="$FRONTEND_PORT"
}

postgresql_installed() {
  command -v psql >/dev/null 2>&1 || dpkg-query -W postgresql >/dev/null 2>&1
}

postgresql_running() {
  command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet postgresql
}

list_postgresql_databases() {
  postgresql_running || return 0
  runuser -u postgres -- psql -Atqc \
    "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname" 2>/dev/null || true
}

show_supported_databases() {
  cat <<'EOF'
Database được MME Linux hỗ trợ:
  1) SQLite tích hợp — khuyến nghị, không cần dịch vụ database riêng.
  2) PostgreSQL 12 trở lên — dùng PostgreSQL hiện có hoặc tự cài bằng apt.
MySQL/MariaDB hiện chưa được hỗ trợ và sẽ không được MME tự ý sử dụng.
EOF
}

choose_database_from_menu() {
  local choice
  show_supported_databases
  if is_interactive; then
    read -r -p 'Chọn database [1]: ' choice
  else
    choice=1
  fi
  case "${choice:-1}" in
    1 | sqlite) DATABASE_ENGINE=sqlite ;;
    2 | postgresql | postgres) DATABASE_ENGINE=postgresql ;;
    *) fail "Lựa chọn database không hợp lệ: $choice" ;;
  esac
}

configure_database_choice() {
  local answer existing_database_url
  existing_database_url="$(read_config_value DATABASE_URL)"
  if [[ -f "$CONFIG_FILE" && -z "$DATABASE_URL_OVERRIDE" && -z "$DATABASE_ENGINE" ]]; then
    echo "Phát hiện database MME đã cấu hình: $(printf '%s' "$existing_database_url" | sed 's#://[^/@]*@#://***@#')"
    if [[ "$ACTION" == upgrade ]] || ! is_interactive; then
      echo 'Giữ nguyên database hiện tại để nâng cấp an toàn.'
      return
    fi
    if prompt_yes_no 'Sử dụng database này cho MME?' yes; then
      return
    fi
    REJECT_EXISTING_SQLITE=1
    choose_database_from_menu
    if [[ "$DATABASE_ENGINE" == postgresql ]]; then
      PROVISION_LOCAL_POSTGRESQL=1
      read -r -p "Tên database mới dành cho MME [$DATABASE_NAME]: " answer
      [[ -n "$answer" ]] && DATABASE_NAME="$answer"
    fi
    return
  fi
  if [[ -n "$DATABASE_URL_OVERRIDE" ]]; then
    [[ ! "$DATABASE_URL_OVERRIDE" =~ [[:space:]] ]] ||
      fail 'DATABASE_URL không được chứa khoảng trắng hoặc xuống dòng; hãy URL-encode ký tự đặc biệt trong tài khoản/mật khẩu.'
    case "$DATABASE_URL_OVERRIDE" in
      file:*) DATABASE_ENGINE=sqlite ;;
      postgresql://* | postgres://*)
        DATABASE_ENGINE=postgresql
        USE_CONFIGURED_POSTGRESQL=1
        ;;
      *) fail 'MME chỉ hỗ trợ DATABASE_URL dạng file: hoặc postgresql://.' ;;
    esac
    export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE"
    return
  fi
  case "$DATABASE_ENGINE" in
    sqlite | postgresql | postgres | '') ;;
    *) fail "Database chưa được MME hỗ trợ: $DATABASE_ENGINE" ;;
  esac
  [[ "$DATABASE_ENGINE" == postgres ]] && DATABASE_ENGINE=postgresql
  if [[ -n "$DATABASE_ENGINE" ]]; then
    if [[ "$DATABASE_ENGINE" == postgresql ]]; then
      if [[ "$existing_database_url" == postgresql://* || "$existing_database_url" == postgres://* ]]; then
        DATABASE_URL_OVERRIDE="$existing_database_url"
        USE_CONFIGURED_POSTGRESQL=1
      else
        PROVISION_LOCAL_POSTGRESQL=1
      fi
    fi
    return
  fi

  if [[ -s "$DATA_DIR/data/mme.db" ]] && is_interactive; then
    echo "Phát hiện SQLite MME hiện có: $DATA_DIR/data/mme.db"
    if prompt_yes_no 'Sử dụng database SQLite này cho MME?' yes; then
      DATABASE_ENGINE=sqlite
      return
    fi
    REJECT_EXISTING_SQLITE=1
  fi

  if postgresql_installed && is_interactive; then
    echo 'Phát hiện PostgreSQL trên máy.'
    if postgresql_running; then
      echo 'Các database hiện có:'
      list_postgresql_databases | sed 's/^/  - /'
    fi
    if prompt_yes_no 'Sử dụng PostgreSQL hiện có cho MME?' yes; then
      DATABASE_ENGINE=postgresql
      PROVISION_LOCAL_POSTGRESQL=1
      read -r -p "Tên database dành cho MME [$DATABASE_NAME]: " answer
      [[ -n "${answer:-}" ]] && DATABASE_NAME="$answer"
      return
    fi
  fi

  if command -v mysql >/dev/null 2>&1 || dpkg-query -W mariadb-server mysql-server >/dev/null 2>&1; then
    echo 'Phát hiện MySQL/MariaDB, nhưng MME chưa hỗ trợ engine này nên sẽ không thay đổi hoặc sử dụng nó.'
  fi

  choose_database_from_menu
  if [[ "$DATABASE_ENGINE" == postgresql ]] && is_interactive; then
    PROVISION_LOCAL_POSTGRESQL=1
    read -r -p "Tên database dành cho MME [$DATABASE_NAME]: " answer
    [[ -n "$answer" ]] && DATABASE_NAME="$answer"
  elif [[ "$DATABASE_ENGINE" == postgresql ]]; then
    PROVISION_LOCAL_POSTGRESQL=1
  fi
}

validate_host() {
  [[ -r /etc/os-release ]] || fail 'Không đọc được /etc/os-release.'
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == ubuntu ]] || fail "Bộ cài này chỉ hỗ trợ Ubuntu; hệ điều hành hiện tại: ${ID:-unknown}."
  version_at_least "${VERSION_ID:-0}" '20.04' || fail "Cần Ubuntu 20.04 trở lên; hiện tại: ${VERSION_ID:-unknown}."
  [[ "$(dpkg --print-architecture)" == amd64 ]] || fail 'Gói hiện tại chỉ hỗ trợ kiến trúc amd64.'
  command -v systemctl >/dev/null 2>&1 || fail 'Không tìm thấy systemctl.'
  [[ -d /run/systemd/system ]] || fail 'systemd không chạy (PID 1). Hãy dùng Ubuntu Server tiêu chuẩn, không chạy trong container.'
}

resolve_deb() {
  if [[ -z "$DEB_PATH" ]]; then
    DEB_PATH="$(find . -maxdepth 1 -type f -name 'mikrotik-manager-enterprise_*_amd64.deb' -print -quit)"
  fi
  [[ -n "$DEB_PATH" && -f "$DEB_PATH" ]] || fail 'Không tìm thấy file DEB. Hãy truyền đường dẫn file vào lệnh.'
  DEB_PATH="$(readlink -f "$DEB_PATH")"
  dpkg-deb --info "$DEB_PATH" >/dev/null || fail 'File DEB không hợp lệ.'
  [[ "$(dpkg-deb --field "$DEB_PATH" Package)" == mikrotik-manager-enterprise ]] ||
    fail 'File DEB không phải gói MikroTik Manager Enterprise.'
}

verify_checksum() {
  if [[ -z "$CHECKSUM_PATH" ]]; then
    local candidate
    candidate="$(dirname "$DEB_PATH")/SHA256SUMS-LINUX.txt"
    [[ -f "$candidate" ]] && CHECKSUM_PATH="$candidate"
  fi
  [[ -n "$CHECKSUM_PATH" ]] || fail 'Thiếu SHA256SUMS-LINUX.txt; từ chối cài gói chưa được xác minh.'
  [[ -f "$CHECKSUM_PATH" ]] || fail "Không tìm thấy checksum: $CHECKSUM_PATH"

  local expected actual base
  base="$(basename "$DEB_PATH")"
  expected="$(awk -v target="$base" '{name=$2; sub(/^\*/, "", name); count=split(name, parts, "/"); if (parts[count] == target) {print tolower($1); exit}}' "$CHECKSUM_PATH")"
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "Checksum không chứa mục hợp lệ cho $base."
  actual="$(sha256sum "$DEB_PATH" | awk '{print tolower($1)}')"
  [[ "$actual" == "$expected" ]] || fail "SHA-256 không khớp cho $base."
  echo "SHA-256 hợp lệ: $actual"
}

install_dependencies() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install --yes --no-install-recommends ca-certificates curl openssl procps systemd
  if [[ "$PROVISION_LOCAL_POSTGRESQL" == 1 ]]; then
    apt-get install --yes --no-install-recommends postgresql postgresql-client
  elif [[ "$USE_CONFIGURED_POSTGRESQL" == 1 ]]; then
    apt-get install --yes --no-install-recommends postgresql-client
  fi
}

prepare_postgresql() {
  [[ "$DATABASE_ENGINE" == postgresql ]] || return 0
  if [[ "$USE_CONFIGURED_POSTGRESQL" == 1 ]]; then
    local psql_url server_version
    # Prisma dùng query parameter `schema`, còn libpq/psql không hiểu tham số này.
    psql_url="$(printf '%s' "$DATABASE_URL_OVERRIDE" | sed -E 's/\?schema=[^&]*&/?/; s/&schema=[^&]*&/\&/g; s/([?&])schema=[^&]*$//; s/[?&]$//')"
    server_version="$(PGCONNECT_TIMEOUT=5 psql "$psql_url" -v ON_ERROR_STOP=1 -Atqc 'SHOW server_version_num')" ||
      fail 'Không thể kết nối PostgreSQL bằng DATABASE_URL đã cung cấp.'
    [[ "$server_version" =~ ^[0-9]+$ ]] && (( server_version >= 120000 )) ||
      fail "MME yêu cầu PostgreSQL 12 trở lên; server trả về: ${server_version:-unknown}."
    export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=postgresql
    echo 'Đã xác minh kết nối PostgreSQL hiện có; MME không thay đổi mật khẩu hoặc database khác.'
    return
  fi

  [[ "$PROVISION_LOCAL_POSTGRESQL" == 1 ]] || fail 'Thiếu phương án cấu hình PostgreSQL.'
  [[ "$DATABASE_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] ||
    fail 'Tên database PostgreSQL chỉ được chứa chữ, số và dấu gạch dưới.'
  systemctl enable --now postgresql
  postgresql_running || fail 'PostgreSQL không khởi động được.'

  local postgres_major password database_exists table_count role_name
  postgres_major="$(psql --version | awk '{split($3, version, "."); print version[1]}')"
  [[ "$postgres_major" =~ ^[0-9]+$ ]] && (( postgres_major >= 12 )) ||
    fail "MME yêu cầu PostgreSQL 12 trở lên; hiện tại: $(psql --version)"
  password="$(openssl rand -hex 24)"
  role_name=mme

  database_exists="$(runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'")"
  if [[ "$database_exists" == 1 ]]; then
    table_count="$(runuser -u postgres -- psql -d "$DATABASE_NAME" -Atqc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
    if [[ "${table_count:-0}" != 0 ]]; then
      echo "Database $DATABASE_NAME đã có $table_count bảng trong schema public."
      if is_interactive; then
        prompt_yes_no 'Cho phép MME đồng bộ schema vào database này? Hãy chắc chắn đã backup.' no ||
          fail 'Đã hủy để bảo vệ database hiện có.'
      elif [[ "$ALLOW_EXISTING_POSTGRESQL" != 1 ]]; then
        fail 'Từ chối thay đổi database PostgreSQL đã có bảng. Chỉ đặt MME_ALLOW_EXISTING_POSTGRESQL=1 sau khi đã backup và xác minh đúng database.'
      fi
    fi
  fi

  if [[ "$(runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname='mme'")" == 1 ]]; then
    role_name="mme_$(openssl rand -hex 4)"
    echo "Role PostgreSQL 'mme' đã tồn tại; tạo role riêng '$role_name' để không đổi mật khẩu hiện có."
  fi
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 \
    -c "CREATE ROLE $role_name LOGIN PASSWORD '$password'" >/dev/null

  if [[ "$database_exists" != 1 ]]; then
    runuser -u postgres -- createdb --owner="$role_name" "$DATABASE_NAME"
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 \
      -c "GRANT CONNECT ON DATABASE \"$DATABASE_NAME\" TO $role_name" >/dev/null
    runuser -u postgres -- psql -d "$DATABASE_NAME" -v ON_ERROR_STOP=1 \
      -c "GRANT USAGE, CREATE ON SCHEMA public TO $role_name" \
      -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $role_name" \
      -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $role_name" \
      -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $role_name" \
      -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $role_name" \
      >/dev/null
  fi

  DATABASE_URL_OVERRIDE="postgresql://$role_name:$password@127.0.0.1:5432/$DATABASE_NAME?schema=public"
  export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME="$DATABASE_NAME"
  echo "PostgreSQL đã sẵn sàng cho MME (database: $DATABASE_NAME, role: $role_name)."
}

prepare_sqlite() {
  [[ "$DATABASE_ENGINE" == sqlite ]] || return 0
  if [[ -z "$DATABASE_URL_OVERRIDE" ]]; then
    if [[ "$REJECT_EXISTING_SQLITE" == 1 ]]; then
      DATABASE_URL_OVERRIDE="file:$DATA_DIR/data/mme-$(date +%Y%m%d-%H%M%S).db"
    else
      DATABASE_URL_OVERRIDE="file:$DATA_DIR/data/mme.db"
    fi
  fi
  export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=sqlite
  echo 'MME sẽ dùng SQLite tích hợp; không cần cài dịch vụ database riêng.'
}

install_package() {
  require_root
  validate_host
  resolve_deb
  verify_checksum
  configure_ports
  configure_database_choice
  install_dependencies
  prepare_postgresql
  prepare_sqlite

  echo "Đang cài $(basename "$DEB_PATH")..."
  dpkg --install "$DEB_PATH"
  mme-control "$ACTION"
  systemctl is-enabled --quiet mme.service || fail 'mme.service chưa được bật tự khởi động.'
  systemctl is-active --quiet mme.service || fail 'mme.service chưa chạy.'
  mme-control health
  echo "Hoàn tất. Dashboard: http://127.0.0.1:$FRONTEND_PORT · Backend API: http://127.0.0.1:$BACKEND_PORT"
}

case "$ACTION" in
  install | upgrade)
    install_package
    ;;
  uninstall)
    require_root
    command -v mme-control >/dev/null 2>&1 && mme-control uninstall
    dpkg --remove mikrotik-manager-enterprise
    echo 'Đã gỡ ứng dụng; dữ liệu và cấu hình vẫn được giữ lại.'
    ;;
  status | health)
    command -v mme-control >/dev/null 2>&1 || fail 'MME chưa được cài đặt.'
    mme-control "$ACTION"
    ;;
  help | --help | -h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
