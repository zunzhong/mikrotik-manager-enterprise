import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { isValidTimeZone, SystemPreferencesService } from './system-preferences.service.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  delete process.env.MME_SYSTEM_PREFERENCES_PATH;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SystemPreferencesService', () => {
  it('validates IANA timezones', () => {
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('Invalid/Timezone')).toBe(false);
  });

  it('persists timezone and language for the whole server', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mme-preferences-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'preferences.json');
    process.env.MME_SYSTEM_PREFERENCES_PATH = path;

    const service = new SystemPreferencesService();
    const saved = service.update({ timeZone: 'Asia/Ho_Chi_Minh', language: 'en' });
    const restored = new SystemPreferencesService().get();

    expect(saved).toMatchObject({ timeZone: 'Asia/Ho_Chi_Minh', language: 'en' });
    expect(restored).toMatchObject({ timeZone: 'Asia/Ho_Chi_Minh', language: 'en' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject(saved);
  });
});
