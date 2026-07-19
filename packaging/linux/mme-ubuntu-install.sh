#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-install}"
DEB_PATH="${2:-}"
CHECKSUM_PATH="${3:-}"

usage() {
  cat <<'EOF'
Cài mới hoặc nâng cấp (100% CLI):
  sudo bash mme-ubuntu-install.sh install  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]
  sudo bash mme-ubuntu-install.sh upgrade  ./mikrotik-manager-enterprise_<version>_amd64.deb [SHA256SUMS-LINUX.txt]

Quản trị:
  sudo bash mme-ubuntu-install.sh uninstall
  bash mme-ubuntu-install.sh status
  bash mme-ubuntu-install.sh health
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
}

install_package() {
  require_root
  validate_host
  resolve_deb
  verify_checksum
  install_dependencies

  echo "Đang cài $(basename "$DEB_PATH")..."
  dpkg --install "$DEB_PATH"
  mme-control "$ACTION"
  systemctl is-enabled --quiet mme.service || fail 'mme.service chưa được bật tự khởi động.'
  systemctl is-active --quiet mme.service || fail 'mme.service chưa chạy.'
  mme-control health
  echo 'Hoàn tất. Dashboard nội bộ: http://127.0.0.1:3000'
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
