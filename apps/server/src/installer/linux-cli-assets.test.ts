import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    expect(linuxJob).toContain('FRONTEND_HOST=0.0.0.0');
    expect(linuxJob).toContain('ready-deb-lan.json');
    expect(linuxJob).toContain('MME_DATABASE_ENGINE=postgresql');
    expect(linuxJob).toContain('topology-deb-postgresql-smoke.json');
    expect(linuxJob).toContain('MME_DATABASE_ENGINE=mariadb');
    expect(linuxJob).toContain('topology-deb-mariadb-smoke.json');
    expect(linuxJob).toContain('SELECT count(*) FROM `mme_ci_mariadb`.`User`');
    expect(linuxJob).toContain('smoke-routeros-features.mjs');
    expect(linuxJob).toContain('routeros-features-deb-smoke.json');
    expect(linuxJob).toContain('syslog-deb-smoke.json');
    expect(linuxJob).toContain('mme-control syslog-check');
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
    expect(build).toContain('database_engines=sqlite,postgresql,mariadb,mysql');
    expect(build).toContain('prisma-client-postgresql');
    expect(build).toContain('schema.postgresql.prisma');
    expect(build).toContain('prisma-client-mysql');
    expect(build).toContain('schema.mysql.prisma');
    expect(build).toContain('iputils-ping');
    const smoke = read('packaging/linux/smoke-ubuntu20.sh');
    expect(smoke).toContain('export FRONTEND_PORT=3180');
    expect(smoke).toContain('http://127.0.0.1:3180/ready');
    expect(smoke).toContain('smoke-frontend-assets.mjs http://127.0.0.1:3100');
    expect(smoke).toContain('smoke-frontend-assets.mjs http://127.0.0.1:3180');
    expect(smoke).toContain('ubuntu20-mysql-schema-validate.log');
    expect(smoke).toContain('ubuntu20-routeros-features.json');
    expect(smoke).toContain('ubuntu20-syslog.json');
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
    expect(installer).toContain('SHA-256 mismatch');
    expect(installer).toContain('mme-control "$ACTION"');
    expect(installer).toContain('mme-control health');
    expect(installer).toContain('MME_BACKEND_PORT');
    expect(installer).toContain('MME_FRONTEND_PORT');
    expect(installer).toContain('MME_LAN_ACCESS');
    expect(installer).toContain('Allow other devices on the LAN to access the MME dashboard?');
    expect(installer).toContain("comment 'MME dashboard'");
    expect(installer).toContain('UFW allows MME dashboard access');
    expect(installer).toContain("comment 'MME Syslog UDP'");
    expect(installer).toContain("comment 'MME Syslog TCP'");
    expect(installer).toContain('Databases supported by MME Linux');
    expect(installer).toContain('Built-in SQLite');
    expect(installer).toContain('PostgreSQL 12 or newer');
    expect(installer).toContain('MariaDB 10.3+ / MySQL 5.7+');
    expect(installer).toContain('USE_CONFIGURED_POSTGRESQL=1');
    expect(installer).toContain('PROVISION_LOCAL_POSTGRESQL=1');
    expect(installer).toContain('USE_INSTALLED_POSTGRESQL=1');
    expect(installer).toContain('USE_CONFIGURED_MYSQL=1');
    expect(installer).toContain('PROVISION_LOCAL_MYSQL=1');
    expect(installer).toContain('USE_INSTALLED_MYSQL=1');
    expect(installer).toContain('mariadb-server mariadb-client');
    expect(installer).toContain('iputils-ping');
    expect(installer).toContain('MME_ALLOW_EXISTING_MYSQL');
    expect(installer).toContain('role_name="mme_$(openssl rand -hex 4)"');
    expect(installer).not.toContain('ALTER ROLE mme');
    const confirmationLines = installer
      .split('\n')
      .filter((line) => line.includes('read -r -p') || line.includes('prompt_yes_no'))
      .join('\n');
    expect(confirmationLines).not.toMatch(/[À-ỹ]/u);
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
    expect(control).toContain('SERVER_HOST=$backend_host');
    expect(control).toContain('FRONTEND_HOST=$frontend_host');
    expect(control).toContain('network-check)');
    expect(control).toContain('feature-check)');
    expect(control).toContain('syslog-check)');
    expect(control).toContain('MME Syslog listener check: PASS');
    const syslogCheck = control.slice(
      control.indexOf('syslog_check()'),
      control.indexOf('remove_syslog_firewall_rules()'),
    );
    expect(syslogCheck.match(/index\(\$4, suffix\)/g)).toHaveLength(2);
    expect(syslogCheck).not.toContain('index($5, suffix)');
    expect(control).toContain('MME Linux platform feature check: PASS');
    expect(control).toContain('Configured dashboard listener');
    expect(control).toContain('database-check)');
    expect(control).toContain('Database engine:');
    expect(control).toContain('login-info)');
    expect(control).toContain('ensure_login_file');
    expect(control).toContain('/root/mme-thong-tin-dang-nhap.txt');
    expect(control).toContain('PRISMA_POSTGRESQL_CLIENT_PATH');
    expect(control).toContain('PRISMA_MYSQL_CLIENT_PATH');
    expect(control).toContain('load_environment_file');
    expect(control).not.toContain('source "$ENV_FILE"');
  });

  it('starts safely before mme.env exists on a fresh Linux installation', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'mme-fresh-control-'));
    try {
      const output = execFileSync(
        'bash',
        [`${repositoryRoot}packaging/linux/mme-control`, 'version'],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            MME_HOME: `${temporary}/app`,
            MME_DATA: `${temporary}/data`,
            MME_CONFIG: `${temporary}/config`,
          },
        },
      );
      expect(output.trim().length).toBeGreaterThan(0);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('selects dedicated Prisma clients and schemas for every supported database engine', () => {
    const prismaService = read('apps/server/src/database/prisma.service.ts');
    const setup = read('apps/server/src/scripts/setup-native.ts');
    const env = read('apps/server/src/config/env.ts');

    expect(prismaService).toContain("databaseUrl.startsWith('mysql://')");
    expect(prismaService).toContain('PRISMA_MYSQL_CLIENT_PATH');
    expect(setup).toContain("prepareRelationalSchema('MariaDB/MySQL'");
    expect(setup).toContain('PRISMA_MYSQL_SCHEMA');
    expect(env).toContain('PRISMA_MYSQL_CLIENT_PATH');
    expect(env).toContain('PRISMA_MYSQL_SCHEMA');
  });

  it('repairs a missing Linux sign-in file against the active database account', () => {
    const credentials = read('apps/server/src/scripts/ensure-login-credentials.ts');
    const guide = read('project-docs/deployment/HUONG-DAN-CAI-DAT-LINUX.md');

    expect(credentials).toContain('passwordService.verify');
    expect(credentials).toContain("process.env.MME_REPAIR_LOGIN_CREDENTIALS !== '1'");
    expect(credentials).toContain('passwordHash: passwordService.hash(password)');
    expect(guide).toContain('sudo mme-control database-check');
    expect(guide).toContain('sudo mme-control login-info');
    expect(guide).toContain('/root/mme-thong-tin-dang-nhap.txt');
  });
});
