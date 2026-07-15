import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type SystemLanguage = 'vi' | 'en';

export interface SystemPreferences {
  timeZone: string;
  language: SystemLanguage;
  updatedAt: string;
}

function preferencesPath(): string {
  if (process.env.MME_SYSTEM_PREFERENCES_PATH) {
    return resolve(process.env.MME_SYSTEM_PREFERENCES_PATH);
  }

  const backupPath = process.env.BACKUP_STORAGE_PATH;
  if (backupPath) return join(dirname(resolve(backupPath)), 'config', 'system-preferences.json');

  return resolve('data/config/system-preferences.json');
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function defaultTimeZone(): string {
  const configured = process.env.TZ?.trim();
  if (configured && isValidTimeZone(configured)) return configured;
  return 'Asia/Ho_Chi_Minh';
}

function defaults(): SystemPreferences {
  return {
    timeZone: defaultTimeZone(),
    language: 'vi',
    updatedAt: new Date().toISOString(),
  };
}

export class SystemPreferencesService {
  private readonly path = preferencesPath();
  private current = this.read();

  private read(): SystemPreferences {
    if (!existsSync(this.path)) return defaults();

    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as Partial<SystemPreferences>;
      return {
        timeZone:
          typeof parsed.timeZone === 'string' && isValidTimeZone(parsed.timeZone)
            ? parsed.timeZone
            : defaultTimeZone(),
        language: parsed.language === 'en' ? 'en' : 'vi',
        updatedAt:
          typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    } catch {
      return defaults();
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.current, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.path);
  }

  public get(): SystemPreferences {
    return { ...this.current };
  }

  public update(input: { timeZone?: string; language?: SystemLanguage }): SystemPreferences {
    if (input.timeZone !== undefined && !isValidTimeZone(input.timeZone)) {
      throw new Error(`Múi giờ IANA không hợp lệ: ${input.timeZone}`);
    }

    this.current = {
      timeZone: input.timeZone ?? this.current.timeZone,
      language: input.language ?? this.current.language,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.get();
  }
}

export const systemPreferencesService = new SystemPreferencesService();
