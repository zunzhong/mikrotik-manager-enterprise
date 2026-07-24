#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-install}"
DEB_PATH="${2:-}"
CHECKSUM_PATH="${3:-}"
BACKEND_PORT="${MME_BACKEND_PORT:-}"
FRONTEND_PORT="${MME_FRONTEND_PORT:-}"
LAN_ACCESS_REQUEST="${MME_LAN_ACCESS:-}"
LAN_ACCESS=0
PRESERVE_NETWORK_HOSTS=0
DATABASE_ENGINE="${MME_DATABASE_ENGINE:-}"
DATABASE_NAME="${MME_DATABASE_NAME:-mme}"
DATABASE_URL_OVERRIDE="${MME_DATABASE_URL:-}"
REJECT_EXISTING_SQLITE=0
PROVISION_LOCAL_POSTGRESQL=0
USE_INSTALLED_POSTGRESQL=0
USE_CONFIGURED_POSTGRESQL=0
ALLOW_EXISTING_POSTGRESQL="${MME_ALLOW_EXISTING_POSTGRESQL:-0}"
PROVISION_LOCAL_MYSQL=0
USE_INSTALLED_MYSQL=0
USE_CONFIGURED_MYSQL=0
ALLOW_EXISTING_MYSQL="${MME_ALLOW_EXISTING_MYSQL:-0}"
CONFIG_FILE=/etc/mikrotik-manager-enterprise/mme.env
DATA_DIR=/var/lib/mikrotik-manager-enterprise

usage() {
  cat <<'EOF'
Install or upgrade (100% CLI):
  sudo bash mme-ubuntu-install.sh install  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]
  sudo bash mme-ubuntu-install.sh upgrade  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]

Management:
  sudo bash mme-ubuntu-install.sh uninstall
  bash mme-ubuntu-install.sh status
  bash mme-ubuntu-install.sh health

Non-interactive/automation:
  MME_BACKEND_PORT=3000 MME_FRONTEND_PORT=8080 MME_DATABASE_ENGINE=sqlite sudo -E bash mme-ubuntu-install.sh install ...
  MME_LAN_ACCESS=1 MME_FRONTEND_PORT=8080 sudo -E bash mme-ubuntu-install.sh install ...
  MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME=mme sudo -E bash mme-ubuntu-install.sh install ...
  MME_DATABASE_ENGINE=mariadb MME_DATABASE_NAME=mme sudo -E bash mme-ubuntu-install.sh install ...
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_root() {
  [[ ${EUID:-$(id -u)} -eq 0 ]] || fail 'Run the installer with sudo.'
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
    fail "Invalid backend port: $BACKEND_PORT"
  [[ -z "$FRONTEND_PORT" ]] || valid_port "$FRONTEND_PORT" ||
    fail "Invalid frontend port: $FRONTEND_PORT"
  if ! valid_port "$BACKEND_PORT"; then
    valid_port "$configured_backend" && BACKEND_PORT="$configured_backend" || BACKEND_PORT=3000
  fi
  if ! valid_port "$FRONTEND_PORT"; then
    valid_port "$configured_frontend" && FRONTEND_PORT="$configured_frontend" || FRONTEND_PORT="$BACKEND_PORT"
  fi

  if is_interactive; then
    echo
    if [[ -f "$CONFIG_FILE" ]]; then
      echo "Current ports: backend $BACKEND_PORT · frontend $FRONTEND_PORT."
      answer='Do you want to change the ports during this upgrade?'
    else
      echo 'MME port configuration (skip to share the default port 3000).'
      answer='Do you want separate backend and frontend ports?'
    fi
    if prompt_yes_no "$answer" no; then
      read -r -p "Backend/API port [$BACKEND_PORT]: " answer
      [[ -n "$answer" ]] && BACKEND_PORT="$answer"
      valid_port "$BACKEND_PORT" || fail "Invalid backend port: $BACKEND_PORT"
      read -r -p "Frontend/dashboard port [$FRONTEND_PORT]: " answer
      [[ -n "$answer" ]] && FRONTEND_PORT="$answer"
      valid_port "$FRONTEND_PORT" || fail "Invalid frontend port: $FRONTEND_PORT"
    fi
  fi

  valid_port "$BACKEND_PORT" || fail "Invalid backend port: $BACKEND_PORT"
  valid_port "$FRONTEND_PORT" || fail "Invalid frontend port: $FRONTEND_PORT"
  export MME_BACKEND_PORT="$BACKEND_PORT" MME_FRONTEND_PORT="$FRONTEND_PORT"
}

parse_boolean() {
  case "${1,,}" in
    1 | true | yes | y | on) printf '1' ;;
    0 | false | no | n | off) printf '0' ;;
    *) return 1 ;;
  esac
}

configure_network_access() {
  local configured_server_host configured_frontend_host current_access prompt_default
  configured_server_host="$(read_config_value SERVER_HOST)"
  configured_frontend_host="$(read_config_value FRONTEND_HOST)"

  if [[ -n "$LAN_ACCESS_REQUEST" ]]; then
    LAN_ACCESS="$(parse_boolean "$LAN_ACCESS_REQUEST")" ||
      fail "Invalid MME_LAN_ACCESS value: $LAN_ACCESS_REQUEST"
  elif [[ -f "$CONFIG_FILE" ]]; then
    if [[ "$FRONTEND_PORT" == "$BACKEND_PORT" ]]; then
      [[ "$configured_server_host" == '0.0.0.0' || "$configured_server_host" == '::' ]] &&
        current_access=1 ||
        current_access=0
    else
      [[ "$configured_frontend_host" == '0.0.0.0' || "$configured_frontend_host" == '::' ]] &&
        current_access=1 ||
        current_access=0
    fi
    LAN_ACCESS="$current_access"
    if is_interactive; then
      [[ "$current_access" == 1 ]] && prompt_default=yes || prompt_default=no
      if prompt_yes_no 'Allow other devices on the LAN to access the MME dashboard?' "$prompt_default"; then
        LAN_ACCESS=1
      else
        LAN_ACCESS=0
      fi
    else
      PRESERVE_NETWORK_HOSTS=1
    fi
  else
    LAN_ACCESS=1
    if is_interactive &&
      ! prompt_yes_no 'Allow other devices on the LAN to access the MME dashboard?' yes; then
      LAN_ACCESS=0
    fi
  fi

  if [[ "$PRESERVE_NETWORK_HOSTS" != 1 ]]; then
    if [[ "$LAN_ACCESS" == 1 ]]; then
      if [[ "$FRONTEND_PORT" == "$BACKEND_PORT" ]]; then
        export MME_SERVER_HOST=0.0.0.0
      else
        export MME_SERVER_HOST=127.0.0.1
      fi
      export MME_FRONTEND_HOST=0.0.0.0
    else
      export MME_SERVER_HOST=127.0.0.1
      export MME_FRONTEND_HOST=127.0.0.1
    fi
  fi
  export MME_LAN_ACCESS_EFFECTIVE="$LAN_ACCESS"
}

configure_firewall() {
  [[ "$LAN_ACCESS" == 1 ]] || return 0
  if ! command -v ufw >/dev/null 2>&1; then
    echo 'UFW is not installed; no UFW rule is required. Custom firewalls must allow the dashboard port.'
    return
  fi
  if ! LC_ALL=C ufw status | grep -q '^Status: active$'; then
    echo 'UFW is inactive; no firewall rule was added.'
    return
  fi

  local default_interface lan_network
  if command -v ip >/dev/null 2>&1; then
    default_interface="$(ip -o -4 route show default 2>/dev/null | awk '{print $5; exit}')"
  fi
  if [[ -n "${default_interface:-}" ]]; then
    lan_network="$(
      ip -o -4 route show dev "$default_interface" scope link 2>/dev/null |
        awk '$1 ~ /^[0-9.]+\/[0-9]+$/ && $1 !~ /^127\./ {print $1; exit}'
    )"
  fi
  if [[ -n "${lan_network:-}" ]]; then
    ufw allow from "$lan_network" to any port "$FRONTEND_PORT" proto tcp comment 'MME dashboard'
    echo "UFW allows MME dashboard access from $lan_network on TCP port $FRONTEND_PORT."
  else
    ufw allow "$FRONTEND_PORT/tcp" comment 'MME dashboard'
    echo "UFW allows MME dashboard access on TCP port $FRONTEND_PORT."
  fi
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

mariadb_installed() {
  command -v mariadb >/dev/null 2>&1 ||
    command -v mysql >/dev/null 2>&1 ||
    dpkg-query -W mariadb-server mysql-server >/dev/null 2>&1
}

mariadb_running() {
  command -v systemctl >/dev/null 2>&1 &&
    { systemctl is-active --quiet mariadb || systemctl is-active --quiet mysql; }
}

mysql_admin() {
  local client
  if command -v mariadb >/dev/null 2>&1; then
    client=mariadb
  else
    client=mysql
  fi
  "$client" --protocol=socket --user=root --batch --skip-column-names "$@"
}

list_mysql_databases() {
  mariadb_running || return 0
  mysql_admin --execute \
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA
     WHERE SCHEMA_NAME NOT IN ('information_schema','mysql','performance_schema','sys')
     ORDER BY SCHEMA_NAME" 2>/dev/null || true
}

show_supported_databases() {
  cat <<'EOF'
Databases supported by MME Linux:
  1) Built-in SQLite — recommended for a simple single-server installation.
  2) PostgreSQL 12 or newer — reuse an installed server or install it with apt.
  3) MariaDB 10.3+ / MySQL 5.7+ — reuse an installed server or install MariaDB with apt.
EOF
}

choose_database_from_menu() {
  local choice
  show_supported_databases
  if is_interactive; then
    read -r -p 'Select a database [1]: ' choice
  else
    choice=1
  fi
  case "${choice:-1}" in
    1 | sqlite) DATABASE_ENGINE=sqlite ;;
    2 | postgresql | postgres) DATABASE_ENGINE=postgresql ;;
    3 | mariadb | mysql) DATABASE_ENGINE=mysql ;;
    *) fail "Invalid database selection: $choice" ;;
  esac
}

configure_database_choice() {
  local answer existing_database_url
  existing_database_url="$(read_config_value DATABASE_URL)"
  if [[ -f "$CONFIG_FILE" && -z "$DATABASE_URL_OVERRIDE" && -z "$DATABASE_ENGINE" ]]; then
    echo "Configured MME database detected: $(printf '%s' "$existing_database_url" | sed 's#://[^/@]*@#://***@#')"
    if [[ "$ACTION" == upgrade ]] || ! is_interactive; then
      echo 'The configured database will be preserved for a safe upgrade.'
      return
    fi
    if prompt_yes_no 'Use this database for MME?' yes; then
      return
    fi
    REJECT_EXISTING_SQLITE=1
    choose_database_from_menu
    if [[ "$DATABASE_ENGINE" == postgresql ]]; then
      PROVISION_LOCAL_POSTGRESQL=1
      read -r -p "New PostgreSQL database name for MME [$DATABASE_NAME]: " answer
      [[ -n "$answer" ]] && DATABASE_NAME="$answer"
    elif [[ "$DATABASE_ENGINE" == mysql ]]; then
      PROVISION_LOCAL_MYSQL=1
      read -r -p "New MariaDB/MySQL database name for MME [$DATABASE_NAME]: " answer
      [[ -n "$answer" ]] && DATABASE_NAME="$answer"
    fi
    return
  fi
  if [[ -n "$DATABASE_URL_OVERRIDE" ]]; then
    [[ ! "$DATABASE_URL_OVERRIDE" =~ [[:space:]] ]] ||
      fail 'DATABASE_URL must not contain spaces or line breaks; URL-encode special characters in usernames and passwords.'
    case "$DATABASE_URL_OVERRIDE" in
      file:*) DATABASE_ENGINE=sqlite ;;
      postgresql://* | postgres://*)
        DATABASE_ENGINE=postgresql
        USE_CONFIGURED_POSTGRESQL=1
        ;;
      mysql://*)
        DATABASE_ENGINE=mysql
        USE_CONFIGURED_MYSQL=1
        ;;
      *) fail 'MME supports file:, postgresql://, postgres://, or mysql:// DATABASE_URL values.' ;;
    esac
    export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE"
    return
  fi
  case "$DATABASE_ENGINE" in
    sqlite | postgresql | postgres | mariadb | mysql | '') ;;
    *) fail "Unsupported MME database: $DATABASE_ENGINE" ;;
  esac
  [[ "$DATABASE_ENGINE" == postgres ]] && DATABASE_ENGINE=postgresql
  [[ "$DATABASE_ENGINE" == mariadb ]] && DATABASE_ENGINE=mysql
  if [[ -n "$DATABASE_ENGINE" ]]; then
    if [[ "$DATABASE_ENGINE" == postgresql ]]; then
      if [[ "$existing_database_url" == postgresql://* || "$existing_database_url" == postgres://* ]]; then
        DATABASE_URL_OVERRIDE="$existing_database_url"
        USE_CONFIGURED_POSTGRESQL=1
      else
        PROVISION_LOCAL_POSTGRESQL=1
      fi
    elif [[ "$DATABASE_ENGINE" == mysql ]]; then
      if [[ "$existing_database_url" == mysql://* ]]; then
        DATABASE_URL_OVERRIDE="$existing_database_url"
        USE_CONFIGURED_MYSQL=1
      else
        PROVISION_LOCAL_MYSQL=1
      fi
    fi
    return
  fi

  if [[ -s "$DATA_DIR/data/mme.db" ]] && is_interactive; then
    echo "Existing MME SQLite database detected: $DATA_DIR/data/mme.db"
    if prompt_yes_no 'Use this SQLite database for MME?' yes; then
      DATABASE_ENGINE=sqlite
      return
    fi
    REJECT_EXISTING_SQLITE=1
  fi

  if postgresql_installed && is_interactive; then
    echo 'An installed PostgreSQL server was detected.'
    if postgresql_running; then
      echo 'Existing PostgreSQL databases:'
      list_postgresql_databases | sed 's/^/  - /'
    fi
    if prompt_yes_no 'Use the installed PostgreSQL server for MME?' yes; then
      DATABASE_ENGINE=postgresql
      USE_INSTALLED_POSTGRESQL=1
      read -r -p "PostgreSQL database name for MME [$DATABASE_NAME]: " answer
      [[ -n "${answer:-}" ]] && DATABASE_NAME="$answer"
      return
    fi
  fi

  if mariadb_installed && is_interactive; then
    echo 'An installed MariaDB/MySQL server was detected.'
    if mariadb_running; then
      echo 'Existing MariaDB/MySQL databases:'
      list_mysql_databases | sed 's/^/  - /'
    fi
    if prompt_yes_no 'Use the installed MariaDB/MySQL server for MME?' yes; then
      DATABASE_ENGINE=mysql
      USE_INSTALLED_MYSQL=1
      read -r -p "MariaDB/MySQL database name for MME [$DATABASE_NAME]: " answer
      [[ -n "${answer:-}" ]] && DATABASE_NAME="$answer"
      return
    fi
  fi

  choose_database_from_menu
  if [[ "$DATABASE_ENGINE" == postgresql ]] && is_interactive; then
    PROVISION_LOCAL_POSTGRESQL=1
    read -r -p "PostgreSQL database name for MME [$DATABASE_NAME]: " answer
    [[ -n "$answer" ]] && DATABASE_NAME="$answer"
  elif [[ "$DATABASE_ENGINE" == postgresql ]]; then
    PROVISION_LOCAL_POSTGRESQL=1
  elif [[ "$DATABASE_ENGINE" == mysql ]] && is_interactive; then
    PROVISION_LOCAL_MYSQL=1
    read -r -p "MariaDB/MySQL database name for MME [$DATABASE_NAME]: " answer
    [[ -n "$answer" ]] && DATABASE_NAME="$answer"
  elif [[ "$DATABASE_ENGINE" == mysql ]]; then
    PROVISION_LOCAL_MYSQL=1
  fi
}

validate_host() {
  [[ -r /etc/os-release ]] || fail 'Unable to read /etc/os-release.'
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == ubuntu ]] || fail "This installer only supports Ubuntu; current OS: ${ID:-unknown}."
  version_at_least "${VERSION_ID:-0}" '20.04' ||
    fail "Ubuntu 20.04 or newer is required; current version: ${VERSION_ID:-unknown}."
  [[ "$(dpkg --print-architecture)" == amd64 ]] ||
    fail 'The current package only supports the amd64 architecture.'
  command -v systemctl >/dev/null 2>&1 || fail 'systemctl was not found.'
  [[ -d /run/systemd/system ]] ||
    fail 'systemd is not running as PID 1. Use a standard Ubuntu Server host, not a container.'
}

resolve_deb() {
  if [[ -z "$DEB_PATH" ]]; then
    DEB_PATH="$(find . -maxdepth 1 -type f -name 'mikrotik-manager-enterprise_*_amd64.deb' -print -quit)"
  fi
  [[ -n "$DEB_PATH" && -f "$DEB_PATH" ]] ||
    fail 'DEB package not found. Pass the package path to the installer.'
  DEB_PATH="$(readlink -f "$DEB_PATH")"
  dpkg-deb --info "$DEB_PATH" >/dev/null || fail 'The DEB package is invalid.'
  [[ "$(dpkg-deb --field "$DEB_PATH" Package)" == mikrotik-manager-enterprise ]] ||
    fail 'The DEB file is not a MikroTik Manager Enterprise package.'
}

verify_checksum() {
  if [[ -z "$CHECKSUM_PATH" ]]; then
    local candidate
    candidate="$(dirname "$DEB_PATH")/SHA256SUMS-LINUX.txt"
    [[ -f "$candidate" ]] && CHECKSUM_PATH="$candidate"
  fi
  [[ -n "$CHECKSUM_PATH" ]] ||
    fail 'SHA256SUMS-LINUX.txt is required; refusing to install an unverified package.'
  [[ -f "$CHECKSUM_PATH" ]] || fail "Checksum file not found: $CHECKSUM_PATH"

  local expected actual base
  base="$(basename "$DEB_PATH")"
  expected="$(awk -v target="$base" '{name=$2; sub(/^\*/, "", name); count=split(name, parts, "/"); if (parts[count] == target) {print tolower($1); exit}}' "$CHECKSUM_PATH")"
  [[ "$expected" =~ ^[0-9a-f]{64}$ ]] ||
    fail "The checksum file has no valid entry for $base."
  actual="$(sha256sum "$DEB_PATH" | awk '{print tolower($1)}')"
  [[ "$actual" == "$expected" ]] || fail "SHA-256 mismatch for $base."
  echo "SHA-256 verified: $actual"
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
  if [[ "$PROVISION_LOCAL_MYSQL" == 1 ]]; then
    apt-get install --yes --no-install-recommends mariadb-server mariadb-client
  elif [[ "$USE_CONFIGURED_MYSQL" == 1 ]]; then
    apt-get install --yes --no-install-recommends mariadb-client python3-minimal
  fi
}

prepare_postgresql() {
  [[ "$DATABASE_ENGINE" == postgresql ]] || return 0
  if [[ "$USE_CONFIGURED_POSTGRESQL" == 1 ]]; then
    local psql_url server_version
    # Prisma dùng query parameter `schema`, còn libpq/psql không hiểu tham số này.
    psql_url="$(printf '%s' "$DATABASE_URL_OVERRIDE" | sed -E 's/\?schema=[^&]*&/?/; s/&schema=[^&]*&/\&/g; s/([?&])schema=[^&]*$//; s/[?&]$//')"
    server_version="$(PGCONNECT_TIMEOUT=5 psql "$psql_url" -v ON_ERROR_STOP=1 -Atqc 'SHOW server_version_num')" ||
      fail 'Unable to connect to PostgreSQL with the supplied DATABASE_URL.'
    [[ "$server_version" =~ ^[0-9]+$ ]] && (( server_version >= 120000 )) ||
      fail "MME requires PostgreSQL 12 or newer; server returned: ${server_version:-unknown}."
    export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=postgresql
    echo 'The existing PostgreSQL connection was verified. MME did not modify other databases or passwords.'
    return
  fi

  [[ "$PROVISION_LOCAL_POSTGRESQL" == 1 || "$USE_INSTALLED_POSTGRESQL" == 1 ]] ||
    fail 'No PostgreSQL configuration method was selected.'
  [[ "$DATABASE_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] ||
    fail 'The PostgreSQL database name may only contain letters, numbers, and underscores.'
  systemctl enable --now postgresql
  postgresql_running || fail 'PostgreSQL failed to start.'

  local postgres_major password database_exists table_count role_name
  postgres_major="$(psql --version | awk '{split($3, version, "."); print version[1]}')"
  [[ "$postgres_major" =~ ^[0-9]+$ ]] && (( postgres_major >= 12 )) ||
    fail "MME requires PostgreSQL 12 or newer; current version: $(psql --version)"
  password="$(openssl rand -hex 24)"
  role_name=mme

  database_exists="$(runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname='$DATABASE_NAME'")"
  if [[ "$database_exists" == 1 ]]; then
    table_count="$(runuser -u postgres -- psql -d "$DATABASE_NAME" -Atqc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
    if [[ "${table_count:-0}" != 0 ]]; then
      echo "Database $DATABASE_NAME already contains $table_count tables in the public schema."
      if is_interactive; then
        prompt_yes_no 'Allow MME to synchronize its schema into this database? Confirm that a backup exists.' no ||
          fail 'Installation cancelled to protect the existing database.'
      elif [[ "$ALLOW_EXISTING_POSTGRESQL" != 1 ]]; then
        fail 'Refusing to modify a PostgreSQL database that already has tables. Set MME_ALLOW_EXISTING_POSTGRESQL=1 only after backup and database verification.'
      fi
    fi
  fi

  if [[ "$(runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname='mme'")" == 1 ]]; then
    role_name="mme_$(openssl rand -hex 4)"
    echo "PostgreSQL role 'mme' already exists. Creating '$role_name' without changing the existing password."
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
  echo "PostgreSQL is ready for MME (database: $DATABASE_NAME, role: $role_name)."
}

validate_mysql_version() {
  local version="$1"
  local numeric="${version%%-*}"
  if [[ "$version" == *MariaDB* ]]; then
    version_at_least "$numeric" '10.3' ||
      fail "MME requires MariaDB 10.3 or newer; server returned: $version."
  else
    version_at_least "$numeric" '5.7' ||
      fail "MME requires MySQL 5.7 or newer; server returned: $version."
  fi
}

write_mysql_defaults_file() {
  local url="$1"
  local target="$2"
  python3 - "$url" "$target" <<'PY'
import os
import sys
from urllib.parse import unquote, urlsplit

url, target = sys.argv[1:3]
parsed = urlsplit(url)
if parsed.scheme != "mysql" or not parsed.hostname or not parsed.username:
    raise SystemExit("Invalid mysql:// DATABASE_URL.")
database = parsed.path.lstrip("/")
if not database or "/" in database:
    raise SystemExit("The mysql:// DATABASE_URL must contain exactly one database name.")

values = {
    "host": parsed.hostname,
    "port": str(parsed.port or 3306),
    "user": unquote(parsed.username),
    "password": unquote(parsed.password or ""),
    "database": unquote(database),
    "protocol": "tcp",
}
if any(any(character in value for character in "\r\n\0") for value in values.values()):
    raise SystemExit("The mysql:// DATABASE_URL contains an unsafe decoded value.")

def escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\t", "\\t")

descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(descriptor, "w", encoding="utf-8") as output:
    output.write("[client]\n")
    for key, value in values.items():
        output.write(f'{key}="{escape(value)}"\n')
PY
}

prepare_mysql() {
  [[ "$DATABASE_ENGINE" == mysql ]] || return 0
  local client
  if command -v mariadb >/dev/null 2>&1; then
    client=mariadb
  else
    client=mysql
  fi

  if [[ "$USE_CONFIGURED_MYSQL" == 1 ]]; then
    local defaults_file server_version
    defaults_file="$(mktemp)"
    write_mysql_defaults_file "$DATABASE_URL_OVERRIDE" "$defaults_file" ||
      fail 'Unable to parse the supplied MariaDB/MySQL DATABASE_URL.'
    server_version="$("$client" --defaults-extra-file="$defaults_file" --batch --skip-column-names \
      --execute 'SELECT VERSION()')" || {
      rm -f "$defaults_file"
      fail 'Unable to connect to MariaDB/MySQL with the supplied DATABASE_URL.'
    }
    rm -f "$defaults_file"
    validate_mysql_version "$server_version"
    export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=mysql
    echo 'The existing MariaDB/MySQL connection was verified. MME did not modify other databases or passwords.'
    return
  fi

  [[ "$PROVISION_LOCAL_MYSQL" == 1 || "$USE_INSTALLED_MYSQL" == 1 ]] ||
    fail 'No MariaDB/MySQL configuration method was selected.'
  [[ "$DATABASE_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] ||
    fail 'The MariaDB/MySQL database name may only contain letters, numbers, and underscores.'

  systemctl enable --now mariadb 2>/dev/null || systemctl enable --now mysql
  mariadb_running || fail 'MariaDB/MySQL failed to start.'

  local password database_exists table_count role_name server_version
  server_version="$(mysql_admin --execute 'SELECT VERSION()')" ||
    fail 'Unable to connect with the local MariaDB/MySQL administrative socket account.'
  validate_mysql_version "$server_version"
  password="$(openssl rand -hex 24)"
  role_name=mme
  database_exists="$(mysql_admin --execute \
    "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$DATABASE_NAME'")"
  if [[ "$database_exists" == 1 ]]; then
    table_count="$(mysql_admin --execute \
      "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DATABASE_NAME'")"
    if [[ "${table_count:-0}" != 0 ]]; then
      echo "Database $DATABASE_NAME already contains $table_count tables."
      if is_interactive; then
        prompt_yes_no 'Allow MME to synchronize its schema into this database? Confirm that a backup exists.' no ||
          fail 'Installation cancelled to protect the existing database.'
      elif [[ "$ALLOW_EXISTING_MYSQL" != 1 ]]; then
        fail 'Refusing to modify a MariaDB/MySQL database that already has tables. Set MME_ALLOW_EXISTING_MYSQL=1 only after backup and database verification.'
      fi
    fi
  fi

  if [[ "$(mysql_admin --execute "SELECT COUNT(*) FROM mysql.user WHERE User='mme'")" != 0 ]]; then
    role_name="mme_$(openssl rand -hex 4)"
    echo "MariaDB/MySQL user 'mme' already exists. Creating '$role_name' without changing the existing password."
  fi
  if [[ "$database_exists" != 1 ]]; then
    mysql_admin --execute \
      "CREATE DATABASE \`$DATABASE_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  fi
  mysql_admin --execute \
    "CREATE USER '$role_name'@'127.0.0.1' IDENTIFIED BY '$password';
     GRANT ALL PRIVILEGES ON \`$DATABASE_NAME\`.* TO '$role_name'@'127.0.0.1';
     FLUSH PRIVILEGES"

  DATABASE_URL_OVERRIDE="mysql://$role_name:$password@127.0.0.1:3306/$DATABASE_NAME"
  export MME_DATABASE_URL="$DATABASE_URL_OVERRIDE" MME_DATABASE_ENGINE=mysql MME_DATABASE_NAME="$DATABASE_NAME"
  echo "MariaDB/MySQL is ready for MME (database: $DATABASE_NAME, user: $role_name)."
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
  echo 'MME will use built-in SQLite; no separate database service is required.'
}

install_package() {
  require_root
  validate_host
  resolve_deb
  verify_checksum
  configure_ports
  configure_network_access
  configure_database_choice
  install_dependencies
  configure_firewall
  prepare_postgresql
  prepare_mysql
  prepare_sqlite

  echo "Installing $(basename "$DEB_PATH")..."
  dpkg --install "$DEB_PATH"
  mme-control "$ACTION"
  systemctl is-enabled --quiet mme.service || fail 'mme.service is not enabled at boot.'
  systemctl is-active --quiet mme.service || fail 'mme.service is not running.'
  mme-control health
  echo "Completed. Dashboard: http://127.0.0.1:$FRONTEND_PORT · Backend API: http://127.0.0.1:$BACKEND_PORT"
}

case "$ACTION" in
  install | upgrade)
    install_package
    ;;
  uninstall)
    require_root
    command -v mme-control >/dev/null 2>&1 && mme-control uninstall
    dpkg --remove mikrotik-manager-enterprise
    echo 'MME was removed; data and configuration were preserved.'
    ;;
  status | health)
    command -v mme-control >/dev/null 2>&1 || fail 'MME is not installed.'
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
