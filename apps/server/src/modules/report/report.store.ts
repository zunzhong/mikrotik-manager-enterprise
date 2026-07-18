import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { ReportHistoryItem, ReportSchedule } from './report.types.js';

interface ReportState {
  version: 1;
  schedules: ReportSchedule[];
  history: ReportHistoryItem[];
}

function reportStorePath(): string | null {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
  if (process.env.MME_REPORT_STORE_PATH) return resolve(process.env.MME_REPORT_STORE_PATH);
  const backupPath = process.env.BACKUP_STORAGE_PATH;
  if (backupPath) return join(dirname(resolve(backupPath)), 'config', 'reports.json');
  return resolve('data/config/reports.json');
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nextReportRun(startAt: string, intervalMinutes: number, now = new Date()): string {
  const start = new Date(startAt);
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  if (Number.isNaN(start.getTime())) return new Date(now.getTime() + intervalMs).toISOString();
  if (start.getTime() >= now.getTime() - 30_000) return start.toISOString();
  const elapsed = now.getTime() - start.getTime();
  return new Date(start.getTime() + Math.ceil(elapsed / intervalMs) * intervalMs).toISOString();
}

export class ReportStore {
  private readonly path = reportStorePath();
  private readonly schedules = new Map<string, ReportSchedule>();
  private history: ReportHistoryItem[] = [];

  public constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (!this.path || !existsSync(this.path)) return;
    try {
      const state = JSON.parse(readFileSync(this.path, 'utf8')) as ReportState;
      for (const schedule of state.schedules ?? []) this.schedules.set(schedule.id, schedule);
      this.history = state.history ?? [];
    } catch {
      // A damaged optional report configuration must not prevent MME from starting.
    }
  }

  private persist(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const state: ReportState = {
      version: 1,
      schedules: this.listSchedules(),
      history: this.history.slice(0, 500),
    };
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.path);
  }

  public listSchedules(): ReportSchedule[] {
    return [...this.schedules.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getSchedule(id: string): ReportSchedule | undefined {
    return this.schedules.get(id);
  }

  public saveSchedule(
    input: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt'>,
    id?: string,
  ): ReportSchedule {
    const current = id ? this.schedules.get(id) : undefined;
    const now = new Date().toISOString();
    const schedule: ReportSchedule = {
      ...input,
      id: current?.id ?? createId('report'),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      lastRunAt: current?.lastRunAt,
      nextRunAt: input.enabled ? nextReportRun(input.startAt, input.intervalMinutes) : undefined,
    };
    this.schedules.set(schedule.id, schedule);
    this.persist();
    return schedule;
  }

  public deleteSchedule(id: string): boolean {
    const deleted = this.schedules.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  public due(now = new Date()): ReportSchedule[] {
    return this.listSchedules().filter(
      (schedule) =>
        schedule.enabled &&
        Boolean(schedule.nextRunAt) &&
        new Date(schedule.nextRunAt as string).getTime() <= now.getTime(),
    );
  }

  public markRun(id: string, runAt = new Date()): ReportSchedule | undefined {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    const next = new Date(runAt.getTime() + schedule.intervalMinutes * 60_000);
    const updated: ReportSchedule = {
      ...schedule,
      lastRunAt: runAt.toISOString(),
      nextRunAt: schedule.enabled ? next.toISOString() : undefined,
      updatedAt: runAt.toISOString(),
    };
    this.schedules.set(id, updated);
    this.persist();
    return updated;
  }

  public addHistory(input: Omit<ReportHistoryItem, 'id' | 'createdAt'>): ReportHistoryItem {
    const item: ReportHistoryItem = {
      ...input,
      id: createId('report_history'),
      createdAt: new Date().toISOString(),
    };
    this.history = [item, ...this.history].slice(0, 500);
    this.persist();
    return item;
  }

  public listHistory(limit = 100): ReportHistoryItem[] {
    return this.history.slice(0, Math.min(Math.max(limit, 1), 500));
  }
}

export const reportStore = new ReportStore();
