import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  safeSyslogFileComponent,
  syslogCalendarDate,
  SyslogFileStore,
  type DailySyslogFileInput,
} from './syslog-file.store.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

function record(overrides: Partial<DailySyslogFileInput> = {}): DailySyslogFileInput {
  return {
    deviceId: 'device-1',
    deviceName: 'Giao An_Office',
    receivedAt: new Date('2026-08-01T18:30:00.000Z'),
    eventTime: null,
    sourceAddress: '10.0.0.2',
    sourcePort: 514,
    protocol: 'udp',
    hostname: 'Giao',
    appName: null,
    processId: null,
    messageId: null,
    facility: 16,
    facilityLabel: 'local0',
    severity: 4,
    severityLabel: 'warning',
    priority: 132,
    tag: null,
    message: 'interface ether1 link down',
    rawMessage: '<132>Giao An_Office interface ether1 link down',
    structuredData: null,
    ...overrides,
  };
}

describe('daily Syslog file storage', () => {
  it('uses cross-platform safe device-and-date file names', () => {
    expect(safeSyslogFileComponent('Giao An_Office')).toBe('Giao_An_Office');
    expect(safeSyslogFileComponent('CON')).toBe('device_CON');
    expect(syslogCalendarDate(new Date('2026-08-01T18:30:00.000Z'), 'Asia/Ho_Chi_Minh')).toBe(
      '2026-08-02',
    );
  });

  it('appends the exact normalized message and downloads the daily file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mme-syslog-files-'));
    temporaryDirectories.push(root);
    const store = new SyslogFileStore(root);

    await store.appendMany([record()], 'Asia/Ho_Chi_Minh');

    const file = await store.dailyFile('device-1', 'Giao An_Office', '2026-08-02');
    expect(file?.fileName).toBe('Giao_An_Office_2026-08-02.log');
    expect(file?.content.toString('utf8')).toContain('\tinterface ether1 link down\n');
    expect(file?.content.toString('utf8')).not.toContain('An_Office interface');
    expect(await readFile(join(root, 'device-1', 'Giao_An_Office_2026-08-02.log'), 'utf8')).toEqual(
      file?.content.toString('utf8'),
    );
  });

  it('purges expired daily files and clears remaining files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mme-syslog-files-'));
    temporaryDirectories.push(root);
    const store = new SyslogFileStore(root);
    await store.appendMany(
      [
        record({ receivedAt: new Date('2026-06-01T00:00:00.000Z') }),
        record({ receivedAt: new Date('2026-08-01T00:00:00.000Z') }),
      ],
      'UTC',
    );

    expect(await store.purge(30, new Date('2026-08-15T00:00:00.000Z'))).toBe(1);
    expect(await store.dailyFile('device-1', 'Giao An_Office', '2026-06-01')).toBeNull();
    expect(await store.clear()).toBe(1);
    expect(await store.dailyFile('device-1', 'Giao An_Office', '2026-08-01')).toBeNull();
  });
});
