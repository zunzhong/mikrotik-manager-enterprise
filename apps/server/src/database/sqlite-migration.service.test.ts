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
  });
});
