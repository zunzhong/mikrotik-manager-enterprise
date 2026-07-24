import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(`${repositoryRoot}${relativePath}`, 'utf8');
}

describe('Ubuntu 20.04 CLI installer assets', () => {
  it('keeps the Linux job independent from Windows and runs it on every push', () => {
    const workflow = read('.github/workflows/platform-installers.yml');
    const linuxJob = workflow.slice(workflow.indexOf('  linux-installer:'));

    expect(linuxJob).toContain("if: github.event_name == 'push'");
    expect(linuxJob).toContain('runs-on: ubuntu-22.04');
    expect(linuxJob).toContain('ubuntu:20.04');
    expect(linuxJob).toContain('build-deb-ubuntu20.sh');
    expect(linuxJob).toContain('smoke-ubuntu20.sh');
    expect(linuxJob).toContain('mme-ubuntu-install.sh');
    expect(linuxJob).toContain('checksum-negative-test.log');
    expect(linuxJob).toContain('ci_upgrade_marker');
    expect(linuxJob).toContain('jwt_before');
    expect(linuxJob).toContain('--env "HOST_UID=$(id -u)"');
    expect(linuxJob).toContain('--env "HOST_GID=$(id -g)"');
    expect(linuxJob).toContain('chown -R ${HOST_UID}:${HOST_GID} artifacts');
    expect(linuxJob).toContain('test -w artifacts');
    expect(linuxJob).toContain('ubuntu20-artifact-ownership.txt');
    expect(linuxJob).toContain('sudo test -s /var/lib/mikrotik-manager-enterprise/data/mme.db');
    expect(linuxJob).toContain('sudo test -s /etc/mikrotik-manager-enterprise/mme.env');
    expect(linuxJob).toContain('test -n "$jwt_before"');
    expect(linuxJob).toContain('MME_FRONTEND_PORT=3080');
    expect(linuxJob).toContain('MME_DATABASE_ENGINE=postgresql');
    expect(linuxJob).toContain('topology-deb-postgresql-smoke.json');
    expect(linuxJob).not.toMatch(/^\s+test -f \/(?:var\/lib|etc)\/mikrotik-manager-enterprise/m);
    expect(linuxJob).not.toContain('windows-installer');
  });

  it('builds on Ubuntu 20.04 with runtime engines for both OpenSSL generations', () => {
    const build = read('packaging/linux/build-deb-ubuntu20.sh');

    expect(build).toContain('"$OS_VERSION_ID" == \'20.04\'');
    expect(build).toContain('binaryTargets = ["debian-openssl-1.1.x", "debian-openssl-3.0.x"]');
    expect(build).toContain('*debian-openssl-1.1.x*');
    expect(build).toContain('*debian-openssl-3.0.x*');
    expect(build).toContain('SHA256SUMS-LINUX.txt');
    expect(build).toContain('mme-ubuntu-install.sh');
    expect(build).toContain('database_engines=sqlite,postgresql');
    expect(build).toContain('prisma-client-postgresql');
    expect(build).toContain('schema.postgresql.prisma');
    const smoke = read('packaging/linux/smoke-ubuntu20.sh');
    expect(smoke).toContain('export FRONTEND_PORT=3180');
    expect(smoke).toContain('http://127.0.0.1:3180/ready');
    expect(smoke).toContain('smoke-frontend-assets.mjs http://127.0.0.1:3100');
    expect(smoke).toContain('smoke-frontend-assets.mjs http://127.0.0.1:3180');
    const frontendSmoke = read('packaging/smoke-frontend-assets.mjs');
    expect(frontendSmoke).toContain("url.pathname.endsWith('.css')");
    expect(frontendSmoke).toContain('upgrade-insecure-requests');
  });

  it('keeps the MME package version isolated from Ubuntu os-release variables', () => {
    const build = read('packaging/linux/build-deb-ubuntu20.sh');

    expect(build).toContain('MME_PACKAGE_VERSION="${1:-}"');
    expect(build).toContain('read_os_release_value() (');
    expect(build).toContain('OS_VERSION_ID="$(read_os_release_value VERSION_ID)"');
    expect(build).not.toContain('source /etc/os-release');
    expect(build).toContain('Version: $MME_PACKAGE_VERSION');
    expect(build).toContain('CONTROL_VERSION=');
    expect(build).toContain('dpkg-deb --field "$PACKAGE" Version');
    expect(build).not.toContain('Version: $VERSION');
  });

  it('requires checksum validation and performs a readiness check during CLI install', () => {
    const installer = read('packaging/linux/mme-ubuntu-install.sh');

    expect(installer).toContain('[[ "${ID:-}" == ubuntu ]]');
    expect(installer).toContain('version_at_least "${VERSION_ID:-0}" \'20.04\'');
    expect(installer).toContain('[[ "$(dpkg --print-architecture)" == amd64 ]]');
    expect(installer).toContain('SHA-256 không khớp');
    expect(installer).toContain('mme-control "$ACTION"');
    expect(installer).toContain('mme-control health');
    expect(installer).toContain('MME_BACKEND_PORT');
    expect(installer).toContain('MME_FRONTEND_PORT');
    expect(installer).toContain('Database được MME Linux hỗ trợ');
    expect(installer).toContain('SQLite tích hợp');
    expect(installer).toContain('PostgreSQL 12 trở lên');
    expect(installer).toContain('MySQL/MariaDB hiện chưa được hỗ trợ');
    expect(installer).toContain('USE_CONFIGURED_POSTGRESQL=1');
    expect(installer).toContain('PROVISION_LOCAL_POSTGRESQL=1');
    expect(installer).toContain('role_name="mme_$(openssl rand -hex 4)"');
    expect(installer).not.toContain('ALTER ROLE mme');
  });

  it('uses the installed package version and rolls back state on failed upgrades', () => {
    const control = read('packaging/linux/mme-control');

    expect(control).toContain('APP_DIR/VERSION');
    expect(control).not.toContain('APP_VERSION=4.1.12');
    expect(control).toContain('backup_state');
    expect(control).toContain('restore_state "$backup"');
    expect(control).toContain('wait_ready 90');
    expect(control).toContain('systemctl enable "$SERVICE"');
    expect(control).toContain('FRONTEND_PORT=$frontend_port');
    expect(control).toContain('PRISMA_POSTGRESQL_CLIENT_PATH');
    expect(control).toContain('load_environment_file');
    expect(control).not.toContain('source "$ENV_FILE"');
  });
});
