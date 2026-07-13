import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { log } from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'prisma/schema.prisma');
const targetPath = resolve(root, 'prisma/schema.sqlite.prisma');
const source = await readFile(sourcePath, 'utf8');

const sqlite = source
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace('tags              Json      @default("[]")', 'tags              Json')
  .replace(
    'url      = env("DATABASE_URL")',
    'url      = env("DATABASE_URL")\n  relationMode = "foreignKeys"',
  );

if (sqlite === source || !sqlite.includes('provider = "sqlite"')) {
  throw new Error('Không thể tạo Prisma schema dành cho SQLite.');
}

await writeFile(targetPath, sqlite, 'utf8');
log(`Đã tạo SQLite schema: ${targetPath}`);
