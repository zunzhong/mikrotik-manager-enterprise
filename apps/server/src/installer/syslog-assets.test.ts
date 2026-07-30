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
  });

  it('ships the Syslog guide in both installer artifacts', () => {
    const workflow = read('.github/workflows/platform-installers.yml');
    const debBuilder = read('packaging/linux/build-deb-ubuntu20.sh');
    const guide = read('project-docs/deployment/HUONG-DAN-SYSLOG-5.8.0.md');
    expect(workflow.match(/HUONG-DAN-SYSLOG-5\.8\.0\.md/g)?.length).toBeGreaterThanOrEqual(4);
    expect(debBuilder).toContain('HUONG-DAN-SYSLOG-5.8.0.md');
    expect(guide).toContain('RFC 3164');
    expect(guide).toContain('RFC 5424');
    expect(guide).toContain('RFC 6587');
    expect(guide).toContain('sudo mme-control syslog-check');
  });
});
