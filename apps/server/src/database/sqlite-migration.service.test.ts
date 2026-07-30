import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SQLITE_SCHEMA_VERSION,
  ensureSqliteSchemaVersion,
} from './sqlite-migration.service.js';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SQLite migration service', () => {
  it('records and preserves the current schema version', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-sqlite-'));
    directories.push(directory);
    const databasePath = join(directory, 'mme.db');

    expect(ensureSqliteSchemaVersion(databasePath)).toBe(CURRENT_SQLITE_SCHEMA_VERSION);
    expect(ensureSqliteSchemaVersion(databasePath)).toBe(CURRENT_SQLITE_SCHEMA_VERSION);
    const database = new DatabaseSync(databasePath);
    const trafficTable = database
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'TrafficSample'`)
      .get() as { name: string } | undefined;
    const alertRuleConfigTable = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'DeviceAlertRuleConfig'`,
      )
      .get() as { name: string } | undefined;
    const alertRuleColumns = database
      .prepare(`PRAGMA table_info("DeviceAlertRuleConfig")`)
      .all() as Array<{ name: string }>;
    const logFingerprintTable = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'RouterOsLogFingerprint'`,
      )
      .get() as { name: string } | undefined;
    const backupScheduleTable = database
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'BackupSchedule'`)
      .get() as { name: string } | undefined;
    const backupScheduleColumns = database
      .prepare(`PRAGMA table_info("BackupSchedule")`)
      .all() as Array<{ name: string }>;
    const topologyTables = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'Topology%' ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    const syslogTables = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'Syslog%' ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    database.close();
    expect(trafficTable?.name).toBe('TrafficSample');
    expect(alertRuleConfigTable?.name).toBe('DeviceAlertRuleConfig');
    expect(logFingerprintTable?.name).toBe('RouterOsLogFingerprint');
    expect(backupScheduleTable?.name).toBe('BackupSchedule');
    expect(backupScheduleColumns.map((column) => column.name)).toContain('scheduledTime');
    expect(backupScheduleColumns.map((column) => column.name)).toContain('maxFiles');
    expect(topologyTables.map((table) => table.name)).toEqual([
      'TopologyManualLink',
      'TopologyNodeLayout',
      'TopologySnapshot',
    ]);
    expect(syslogTables.map((table) => table.name)).toEqual([
      'SyslogMessage',
      'SyslogSetting',
      'SyslogSourceAlias',
    ]);
    expect(alertRuleColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['channelIds', 'notifyAllChannels']),
    );
  });

  it('upgrades a 5.1.0 database from schema v5 with the backup scheduler table', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-sqlite-v5-'));
    directories.push(directory);
    const databasePath = join(directory, 'mme.db');
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "Device" ("id" TEXT NOT NULL PRIMARY KEY);
      CREATE TABLE "MME_SchemaVersion" (
        "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
        "version" INTEGER NOT NULL,
        "appliedAt" TEXT NOT NULL
      );
      INSERT INTO "MME_SchemaVersion" ("id", "version", "appliedAt")
      VALUES (1, 5, CURRENT_TIMESTAMP);
    `);
    database.close();

    expect(ensureSqliteSchemaVersion(databasePath)).toBe(CURRENT_SQLITE_SCHEMA_VERSION);

    const upgraded = new DatabaseSync(databasePath);
    const table = upgraded
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'BackupSchedule'`)
      .get() as { name: string } | undefined;
    const version = upgraded
      .prepare('SELECT "version" FROM "MME_SchemaVersion" WHERE "id" = 1')
      .get() as { version: number };
    const columns = upgraded.prepare(`PRAGMA table_info("BackupSchedule")`).all() as Array<{
      name: string;
    }>;
    upgraded.close();

    expect(table?.name).toBe('BackupSchedule');
    expect(columns.map((column) => column.name)).toContain('scheduledTime');
    expect(columns.map((column) => column.name)).toContain('maxFiles');
    expect(version.version).toBe(CURRENT_SQLITE_SCHEMA_VERSION);
  });

  it('rejects a database created by a newer application', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-sqlite-'));
    directories.push(directory);
    const databasePath = join(directory, 'mme.db');
    ensureSqliteSchemaVersion(databasePath);
    const database = new DatabaseSync(databasePath);
    database.prepare('UPDATE "MME_SchemaVersion" SET "version" = 999 WHERE "id" = 1').run();
    database.close();

    expect(() => ensureSqliteSchemaVersion(databasePath)).toThrow('Không thể downgrade');
  }, 15_000);

  it('normalizes legacy device connection states to online or offline', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-sqlite-status-v9-'));
    directories.push(directory);
    const databasePath = join(directory, 'mme.db');
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "Device" ("id" TEXT NOT NULL PRIMARY KEY, "status" TEXT NOT NULL);
      INSERT INTO "Device" ("id", "status") VALUES
        ('reachable', 'degraded'),
        ('not-polled', 'unknown'),
        ('unreachable', 'offline');
      CREATE TABLE "MME_SchemaVersion" (
        "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
        "version" INTEGER NOT NULL,
        "appliedAt" TEXT NOT NULL
      );
      INSERT INTO "MME_SchemaVersion" ("id", "version", "appliedAt")
      VALUES (1, 9, CURRENT_TIMESTAMP);
    `);
    database.close();

    expect(ensureSqliteSchemaVersion(databasePath)).toBe(CURRENT_SQLITE_SCHEMA_VERSION);
    const upgraded = new DatabaseSync(databasePath);
    const statuses = upgraded
      .prepare('SELECT "id", "status" FROM "Device" ORDER BY "id"')
      .all() as Array<{ id: string; status: string }>;
    upgraded.close();

    expect(statuses).toEqual([
      { id: 'not-polled', status: 'offline' },
      { id: 'reachable', status: 'online' },
      { id: 'unreachable', status: 'offline' },
    ]);
  });

  it('accepts a fresh Prisma database that already contains current alert columns', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-sqlite-current-'));
    directories.push(directory);
    const databasePath = join(directory, 'mme.db');
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE "Device" ("id" TEXT NOT NULL PRIMARY KEY);
      CREATE TABLE "DeviceAlertRuleConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT NOT NULL,
        "ruleKey" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "channelIds" JSONB,
        "notifyAllChannels" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    database.close();

    expect(ensureSqliteSchemaVersion(databasePath)).toBe(CURRENT_SQLITE_SCHEMA_VERSION);
  });
});
