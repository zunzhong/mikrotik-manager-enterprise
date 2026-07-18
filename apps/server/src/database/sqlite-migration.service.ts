import { DatabaseSync } from 'node:sqlite';

export const CURRENT_SQLITE_SCHEMA_VERSION = 9;

interface Migration {
  version: number;
  statements: string[];
}

const migrations: Migration[] = [
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS "TrafficSample" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT NOT NULL,
        "interfaceName" TEXT NOT NULL,
        "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "rxBytes" BIGINT NOT NULL,
        "txBytes" BIGINT NOT NULL,
        "rxDeltaBytes" BIGINT NOT NULL DEFAULT 0,
        "txDeltaBytes" BIGINT NOT NULL DEFAULT 0,
        "rxBps" REAL NOT NULL DEFAULT 0,
        "txBps" REAL NOT NULL DEFAULT 0,
        "running" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "TrafficSample_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      'CREATE INDEX IF NOT EXISTS "TrafficSample_deviceId_collectedAt_idx" ON "TrafficSample"("deviceId", "collectedAt")',
      'CREATE INDEX IF NOT EXISTS "TrafficSample_deviceId_interfaceName_collectedAt_idx" ON "TrafficSample"("deviceId", "interfaceName", "collectedAt")',
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS "DeviceAlertRuleConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT NOT NULL,
        "ruleKey" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "DeviceAlertRuleConfig_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "DeviceAlertRuleConfig_deviceId_ruleKey_key" ON "DeviceAlertRuleConfig"("deviceId", "ruleKey")',
      'CREATE INDEX IF NOT EXISTS "DeviceAlertRuleConfig_deviceId_idx" ON "DeviceAlertRuleConfig"("deviceId")',
      'CREATE INDEX IF NOT EXISTS "DeviceAlertRuleConfig_ruleKey_idx" ON "DeviceAlertRuleConfig"("ruleKey")',
    ],
  },
  {
    version: 4,
    statements: [
      'ALTER TABLE "DeviceAlertRuleConfig" ADD COLUMN "channelIds" JSONB',
      'ALTER TABLE "DeviceAlertRuleConfig" ADD COLUMN "notifyAllChannels" BOOLEAN NOT NULL DEFAULT true',
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS "RouterOsLogFingerprint" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT NOT NULL,
        "fingerprint" TEXT NOT NULL,
        "logTime" TEXT,
        "topics" TEXT,
        "message" TEXT,
        "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RouterOsLogFingerprint_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "RouterOsLogFingerprint_deviceId_fingerprint_key" ON "RouterOsLogFingerprint"("deviceId", "fingerprint")',
      'CREATE INDEX IF NOT EXISTS "RouterOsLogFingerprint_deviceId_firstSeenAt_idx" ON "RouterOsLogFingerprint"("deviceId", "firstSeenAt")',
    ],
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS "BackupSchedule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "deviceId" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "type" TEXT NOT NULL DEFAULT 'export',
        "intervalHours" INTEGER NOT NULL DEFAULT 24,
        "lastRunAt" DATETIME,
        "nextRunAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "BackupSchedule_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "BackupSchedule_deviceId_key" ON "BackupSchedule"("deviceId")',
      'CREATE INDEX IF NOT EXISTS "BackupSchedule_enabled_nextRunAt_idx" ON "BackupSchedule"("enabled", "nextRunAt")',
    ],
  },
  {
    version: 7,
    statements: [
      `ALTER TABLE "BackupSchedule" ADD COLUMN "scheduledTime" TEXT NOT NULL DEFAULT '02:00'`,
    ],
  },
  {
    version: 8,
    statements: [`ALTER TABLE "BackupSchedule" ADD COLUMN "maxFiles" INTEGER NOT NULL DEFAULT 30`],
  },
  {
    version: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS "TopologySnapshot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "scope" TEXT NOT NULL DEFAULT 'all',
        "graphHash" TEXT NOT NULL,
        "nodes" JSONB NOT NULL,
        "links" JSONB NOT NULL,
        "summary" JSONB NOT NULL,
        "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      'CREATE INDEX IF NOT EXISTS "TopologySnapshot_scope_collectedAt_idx" ON "TopologySnapshot"("scope", "collectedAt")',
      'CREATE INDEX IF NOT EXISTS "TopologySnapshot_graphHash_idx" ON "TopologySnapshot"("graphHash")',
      `CREATE TABLE IF NOT EXISTS "TopologyManualLink" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sourceNodeId" TEXT NOT NULL,
        "targetNodeId" TEXT NOT NULL,
        "label" TEXT,
        "locked" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "TopologyManualLink_sourceNodeId_targetNodeId_key" ON "TopologyManualLink"("sourceNodeId", "targetNodeId")',
      'CREATE INDEX IF NOT EXISTS "TopologyManualLink_sourceNodeId_idx" ON "TopologyManualLink"("sourceNodeId")',
      'CREATE INDEX IF NOT EXISTS "TopologyManualLink_targetNodeId_idx" ON "TopologyManualLink"("targetNodeId")',
      `CREATE TABLE IF NOT EXISTS "TopologyNodeLayout" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "scope" TEXT NOT NULL DEFAULT 'all',
        "nodeId" TEXT NOT NULL,
        "x" REAL NOT NULL,
        "y" REAL NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "TopologyNodeLayout_scope_nodeId_key" ON "TopologyNodeLayout"("scope", "nodeId")',
      'CREATE INDEX IF NOT EXISTS "TopologyNodeLayout_scope_idx" ON "TopologyNodeLayout"("scope")',
    ],
  },
];

export function ensureSqliteSchemaVersion(databasePath: string): number {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS "MME_SchemaVersion" (
        "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
        "version" INTEGER NOT NULL,
        "appliedAt" TEXT NOT NULL
      );
    `);

    const current = database
      .prepare('SELECT "version" FROM "MME_SchemaVersion" WHERE "id" = 1')
      .get() as { version: number } | undefined;
    let version = current?.version ?? 0;

    if (version > CURRENT_SQLITE_SCHEMA_VERSION) {
      throw new Error(
        `Database đang ở schema v${version}, mới hơn ứng dụng v${CURRENT_SQLITE_SCHEMA_VERSION}. Không thể downgrade an toàn.`,
      );
    }

    for (const migration of migrations.filter((item) => item.version > version)) {
      database.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of migration.statements) {
          try {
            database.exec(statement);
          } catch (error) {
            // A fresh Prisma-created database already contains columns from the current
            // schema. Treat only duplicate-column ALTERs as idempotent migrations.
            if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) {
              throw error;
            }
          }
        }
        database
          .prepare(
            'INSERT INTO "MME_SchemaVersion" ("id", "version", "appliedAt") VALUES (1, ?, ?) ON CONFLICT("id") DO UPDATE SET "version" = excluded."version", "appliedAt" = excluded."appliedAt"',
          )
          .run(migration.version, new Date().toISOString());
        database.exec('COMMIT');
        version = migration.version;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }

    if (version === 0) {
      database
        .prepare('INSERT INTO "MME_SchemaVersion" ("id", "version", "appliedAt") VALUES (1, ?, ?)')
        .run(CURRENT_SQLITE_SCHEMA_VERSION, new Date().toISOString());
      version = CURRENT_SQLITE_SCHEMA_VERSION;
    }

    return version;
  } finally {
    database.close();
  }
}
