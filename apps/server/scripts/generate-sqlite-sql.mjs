import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { log } from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema-datamodel',
    'prisma/schema.sqlite.prisma',
    '--script',
  ],
  { cwd: root, encoding: 'utf8', env: process.env },
);

if (result.status !== 0 || !result.stdout.includes('CREATE TABLE')) {
  const detail =
    result.error?.message || result.stderr || result.stdout || 'Không có output từ Prisma CLI.';
  throw new Error(`Không thể sinh SQL SQLite:\n${detail}`);
}

const target = resolve(root, 'prisma/schema.sqlite.sql');
await writeFile(target, result.stdout, 'utf8');
log(`Đã tạo SQL khởi tạo SQLite: ${target}`);
