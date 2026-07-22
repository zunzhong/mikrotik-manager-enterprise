import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { prisma } from '../database/index.js';
import { seedDatabase } from '../database/seed.service.js';
import { ensureSqliteSchemaVersion } from '../database/sqlite-migration.service.js';

function sqlitePathFromUrl(url: string): string {
  if (!url.startsWith('file:')) throw new Error('MME Desktop yêu cầu DATABASE_URL dạng file:...');
  const path = url.slice('file:'.length);
  return resolve(path);
}

function preparePostgresqlSchema(): void {
  const prismaCli = process.env.PRISMA_CLI_PATH;
  const schemaPath = process.env.PRISMA_POSTGRESQL_SCHEMA;
  if (!prismaCli || !schemaPath) {
    throw new Error('Payload PostgreSQL chưa đầy đủ; thiếu Prisma CLI hoặc schema PostgreSQL.');
  }
  if (!existsSync(prismaCli) || !existsSync(schemaPath)) {
    throw new Error('Không tìm thấy Prisma CLI hoặc schema PostgreSQL trong payload MME.');
  }

  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'push', '--skip-generate', '--schema', schemaPath],
    { env: process.env, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || result.error?.message || 'không có chi tiết';
    throw new Error(`Không thể đồng bộ schema PostgreSQL:\n${detail}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Thiếu biến DATABASE_URL.');

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
    preparePostgresqlSchema();
  } else {
    throw new Error('MME chỉ hỗ trợ DATABASE_URL dạng file: (SQLite) hoặc postgresql://.');
  }

  const result = await seedDatabase();
  console.log(`MME đã sẵn sàng (${databaseDescription}). Quản trị viên: ${result.adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
