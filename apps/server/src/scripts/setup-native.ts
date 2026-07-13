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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Thiếu biến DATABASE_URL.');

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

  const schemaVersion = ensureSqliteSchemaVersion(databasePath);

  const result = await seedDatabase();
  console.log(
    `MME Desktop đã sẵn sàng (schema v${schemaVersion}). Quản trị viên: ${result.adminEmail}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
