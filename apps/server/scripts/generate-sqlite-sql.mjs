import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { log } from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(
  command,
  [
    'exec',
    'prisma',
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
  throw new Error(`Không thể sinh SQL SQLite:\n${result.stderr || result.stdout}`);
}

const target = resolve(root, 'prisma/schema.sqlite.sql');
await writeFile(target, result.stdout, 'utf8');
log(`Đã tạo SQL khởi tạo SQLite: ${target}`);
