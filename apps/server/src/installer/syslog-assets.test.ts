import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(`${repositoryRoot}${relativePath}`, 'utf8');
}

describe('Centralized Syslog release assets', () => {
  it('ships direct UDP/TCP runtime smoke coverage', () => {
    const smoke = read('packaging/smoke-syslog.mjs');
    expect(smoke).toContain('dgram.createSocket');
    expect(smoke).toContain('net.createConnection');
    expect(smoke).toContain('/api/v1/syslog/messages');
    expect(smoke).toContain('/api/v1/syslog/test');
    expect(smoke).toContain('udpReceiver: true');
    expect(smoke).toContain('tcpReceiver: true');
    expect(smoke).toContain('manualSourceStorage: true');
    expect(smoke).toContain('manualServerConfiguration: true');
    expect(smoke).toContain('atomicConfigurationRollback: true');
    expect(smoke).toContain('manualConfigurationAudit: true');
    expect(smoke).toContain('failedConfigurationAudit: true');
    const service = read('apps/server/src/modules/syslog/syslog.service.ts');
    expect(service).toContain('mme-syslog-self-test-');
    expect(service).toContain('search: marker');
    expect(service).toContain('for (let attempt = 0; attempt < 50; attempt += 1)');
    expect(service).not.toContain('after.stored > before.stored');
  });

  it('ships the Syslog guide in both installer artifacts', () => {
    const workflow = read('.github/workflows/platform-installers.yml');
    const debBuilder = read('packaging/linux/build-deb-ubuntu20.sh');
    const guide = read('project-docs/deployment/HUONG-DAN-SYSLOG-6.0.0.md');
    const syslogUi = read('apps/web/src/modules/syslog/SyslogCenter.tsx');
    const windowsControl = read('packaging/windows/MME-Control.ps1');
    expect(workflow.match(/HUONG-DAN-SYSLOG-6\.0\.0\.md/g)?.length).toBeGreaterThanOrEqual(4);
    expect(debBuilder).toContain('HUONG-DAN-SYSLOG-6.0.0.md');
    expect(guide).toContain('RFC 3164');
    expect(guide).toContain('RFC 5424');
    expect(guide).toContain('RFC 6587');
    expect(guide).toContain('sudo mme-control syslog-check');
    expect(guide).toContain('Cấu Hình Server Syslog');
    expect(guide).toContain('remote=10.0.0.11');
    expect(guide).toContain('remote-port=514');
    expect(guide).not.toContain('remote-port=10.0.0.11:514');
    expect(guide).toContain('remote-log-format=syslog');
    expect(guide).toContain('name=MMESyslog');
    expect(guide).not.toContain('name=mme-syslog');
    expect(guide).toContain(':log warning "MME manual Syslog test"');
    expect(guide).toContain('mọi network profile');
    expect(guide).toContain('LocalSubnet');
    expect(workflow).toContain('routeros-syslog-windows-smoke.json');
    expect(windowsControl).toContain('-Profile Any');
    expect(windowsControl).toContain('-RemoteAddress LocalSubnet');
    expect(syslogUi).toContain("tr('Cấu Hình Server Syslog', 'Syslog Server Configuration')");
  });
});
