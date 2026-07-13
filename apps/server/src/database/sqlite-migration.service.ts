import { DatabaseSync } from 'node:sqlite';

export const CURRENT_SQLITE_SCHEMA_VERSION = 1;

interface Migration {
  version: number;
  statements: string[];
}

const migrations: Migration[] = [];

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
        for (const statement of migration.statements) database.exec(statement);
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
