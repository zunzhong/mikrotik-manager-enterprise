import { appendFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { DateTime } from 'luxon';
import type { StoredSyslogInput } from './syslog.repository.js';

export interface DailySyslogFileInput extends StoredSyslogInput {
  deviceName: string | null;
}

export interface DailySyslogFile {
  fileName: string;
  content: Buffer;
  size: number;
  modifiedAt: string;
}

function defaultStoragePath(): string {
  const configured = process.env.SYSLOG_FILE_STORAGE_PATH?.trim();
  if (configured) return resolve(configured);

  const backupPath = process.env.BACKUP_STORAGE_PATH?.trim();
  if (backupPath) return join(dirname(resolve(backupPath)), 'logs', 'syslog');

  return resolve('data/logs/syslog');
}

export function safeSyslogFileComponent(value: string, fallback = 'unknown'): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[_\s.-]+|[_\s.-]+$/g, '')
    .slice(0, 96);
  const candidate = normalized || fallback;
  return /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(candidate)
    ? `device_${candidate}`
    : candidate;
}

export function syslogCalendarDate(receivedAt: Date, timeZone: string): string {
  return DateTime.fromJSDate(receivedAt, { zone: 'utc' }).setZone(timeZone).toFormat('yyyy-LL-dd');
}

function logLine(record: DailySyslogFileInput, timeZone: string): string {
  const timestamp = DateTime.fromJSDate(record.receivedAt, { zone: 'utc' })
    .setZone(timeZone)
    .toISO({ suppressMilliseconds: false });
  const application = record.appName ?? record.tag ?? '-';
  const source = `${record.sourceAddress}${record.sourcePort ? `:${record.sourcePort}` : ''}`;
  const message = record.message.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  return `${timestamp}\t${record.protocol.toUpperCase()}\t${record.severityLabel.toUpperCase()}\t${record.facilityLabel}/${application}\t${source}\t${message}\n`;
}

export class SyslogFileStore {
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(public readonly rootPath = defaultStoragePath()) {}

  public appendMany(records: DailySyslogFileInput[], timeZone: string): Promise<void> {
    if (records.length === 0) return Promise.resolve();
    const operation = this.writeQueue.then(() => this.appendBatch(records, timeZone));
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  public async dailyFile(
    deviceId: string,
    deviceName: string,
    date: string,
  ): Promise<DailySyslogFile | null> {
    await this.writeQueue;
    const directory = this.deviceDirectory(deviceId);
    const expectedName = this.fileName(deviceName, date);
    let selectedName = expectedName;
    try {
      await stat(join(directory, selectedName));
    } catch {
      let entries: string[];
      try {
        entries = await readdir(directory);
      } catch {
        return null;
      }
      selectedName =
        entries
          .filter((entry) => entry.endsWith(`_${date}.log`))
          .sort()
          .at(-1) ?? '';
      if (!selectedName) return null;
    }

    const path = join(directory, selectedName);
    const [content, metadata] = await Promise.all([readFile(path), stat(path)]);
    return {
      fileName: selectedName,
      content,
      size: metadata.size,
      modifiedAt: metadata.mtime.toISOString(),
    };
  }

  public async purge(retentionDays: number, now = new Date(), timeZone = 'UTC'): Promise<number> {
    await this.writeQueue;
    const cutoff = DateTime.fromJSDate(now, { zone: 'utc' })
      .setZone(timeZone)
      .minus({ days: retentionDays })
      .toFormat('yyyy-LL-dd');
    let deleted = 0;
    let directories: Array<{ name: string; isDirectory(): boolean }>;
    try {
      directories = (await readdir(this.rootPath, { withFileTypes: true })) as Array<{
        name: string;
        isDirectory(): boolean;
      }>;
    } catch {
      return 0;
    }
    for (const directory of directories) {
      if (!directory.isDirectory()) continue;
      const path = join(this.rootPath, directory.name);
      const files = await readdir(path, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) continue;
        const match = /_(\d{4}-\d{2}-\d{2})\.log$/.exec(file.name);
        if (!match || match[1] >= cutoff) continue;
        await rm(join(path, file.name), { force: true });
        deleted += 1;
      }
    }
    return deleted;
  }

  public async clear(): Promise<number> {
    await this.writeQueue;
    let count = 0;
    try {
      const directories = await readdir(this.rootPath, { withFileTypes: true });
      for (const directory of directories) {
        if (!directory.isDirectory()) continue;
        const files = await readdir(join(this.rootPath, directory.name), { withFileTypes: true });
        count += files.filter((file) => file.isFile() && file.name.endsWith('.log')).length;
      }
    } catch {
      return 0;
    }
    await rm(this.rootPath, { recursive: true, force: true });
    await mkdir(this.rootPath, { recursive: true });
    return count;
  }

  private async appendBatch(records: DailySyslogFileInput[], timeZone: string): Promise<void> {
    const batches = new Map<string, string[]>();
    for (const record of records) {
      const identity = record.deviceName ?? record.hostname ?? `unmatched_${record.sourceAddress}`;
      const date = syslogCalendarDate(record.receivedAt, timeZone);
      const directory = this.deviceDirectory(
        record.deviceId ?? `unmatched_${record.sourceAddress}`,
      );
      const path = join(directory, this.fileName(identity, date));
      const lines = batches.get(path) ?? [];
      lines.push(logLine(record, timeZone));
      batches.set(path, lines);
    }

    for (const [path, lines] of batches) {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, lines.join(''), 'utf8');
    }
  }

  private deviceDirectory(deviceId: string): string {
    return join(this.rootPath, safeSyslogFileComponent(deviceId, 'unmatched'));
  }

  private fileName(identity: string, date: string): string {
    return `${safeSyslogFileComponent(identity, 'device')}_${date}.log`;
  }
}

export const syslogFileStore = new SyslogFileStore();
