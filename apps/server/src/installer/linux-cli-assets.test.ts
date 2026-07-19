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
    expect(linuxJob).not.toContain('windows-installer');
  });

  it('builds on Ubuntu 20.04 with runtime engines for both OpenSSL generations', () => {
    const build = read('packaging/linux/build-deb-ubuntu20.sh');

    expect(build).toContain('"${VERSION_ID:-}" == \'20.04\'');
    expect(build).toContain('binaryTargets = ["debian-openssl-1.1.x", "debian-openssl-3.0.x"]');
    expect(build).toContain('*debian-openssl-1.1.x*');
    expect(build).toContain('*debian-openssl-3.0.x*');
    expect(build).toContain('SHA256SUMS-LINUX.txt');
    expect(build).toContain('mme-ubuntu-install.sh');
  });

  it('requires checksum validation and performs a readiness check during CLI install', () => {
    const installer = read('packaging/linux/mme-ubuntu-install.sh');

    expect(installer).toContain('[[ "${ID:-}" == ubuntu ]]');
    expect(installer).toContain('version_at_least "${VERSION_ID:-0}" \'20.04\'');
    expect(installer).toContain('[[ "$(dpkg --print-architecture)" == amd64 ]]');
    expect(installer).toContain('SHA-256 không khớp');
    expect(installer).toContain('mme-control "$ACTION"');
    expect(installer).toContain('mme-control health');
  });

  it('uses the installed package version and rolls back state on failed upgrades', () => {
    const control = read('packaging/linux/mme-control');

    expect(control).toContain('APP_DIR/VERSION');
    expect(control).not.toContain('APP_VERSION=4.1.12');
    expect(control).toContain('backup_state');
    expect(control).toContain('restore_state "$backup"');
    expect(control).toContain('wait_ready 90');
    expect(control).toContain('systemctl enable "$SERVICE"');
  });
});
