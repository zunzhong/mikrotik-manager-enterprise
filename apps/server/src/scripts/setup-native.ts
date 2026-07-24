import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { prisma } from '../database/index.js';
import { seedDatabase } from '../database/seed.service.js';
import { ensureSqliteSchemaVersion } from '../database/sqlite-migration.service.js';

function sqlitePathFromUrl(url: string): string {
  if (!url.startsWith('file:')) {
    throw new Error('MME SQLite requires a file: DATABASE_URL.');
  }
  const path = url.slice('file:'.length);
  return resolve(path);
}

function prepareRelationalSchema(databaseLabel: string, schemaPath: string | undefined): void {
  const prismaCli = process.env.PRISMA_CLI_PATH;
  if (!prismaCli || !schemaPath) {
    throw new Error(`${databaseLabel} payload is incomplete: Prisma CLI or schema is missing.`);
  }
  if (!existsSync(prismaCli) || !existsSync(schemaPath)) {
    throw new Error(`${databaseLabel} Prisma CLI or schema was not found in the MME payload.`);
  }

  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'push', '--skip-generate', '--schema', schemaPath],
    { env: process.env, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || result.error?.message || 'no details';
    throw new Error(`Unable to synchronize the ${databaseLabel} schema:\n${detail}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing.');

  let databaseDescription = 'PostgreSQL';
  let schemaVersion: number | undefined;
  if (databaseUrl.startsWith('file:')) {
    const databasePath = sqlitePathFromUrl(databaseUrl);
    mkdirSync(dirname(databasePath), { recursive: true });

    if (!existsSync(databasePath)) {
      const schemaPath = resolve(process.env.SQLITE_SCHEMA_SQL ?? 'prisma/schema.sqlite.sql');
      const database = new DatabaseSync(databasePath);
      try {
        database.exec(readFileSync(schemaPath, 'utf8'));
      } finally {
        database.close();
      }
    }
    schemaVersion = ensureSqliteSchemaVersion(databasePath);
    databaseDescription = `SQLite schema v${schemaVersion}`;
  } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    prepareRelationalSchema('PostgreSQL', process.env.PRISMA_POSTGRESQL_SCHEMA);
  } else if (databaseUrl.startsWith('mysql://')) {
    prepareRelationalSchema('MariaDB/MySQL', process.env.PRISMA_MYSQL_SCHEMA);
    databaseDescription = 'MariaDB/MySQL';
  } else {
    throw new Error(
      'MME supports file: (SQLite), postgresql://, postgres://, or mysql:// DATABASE_URL values.',
    );
  }

  const result = await seedDatabase();
  console.log(`MME is ready (${databaseDescription}). Administrator: ${result.adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
