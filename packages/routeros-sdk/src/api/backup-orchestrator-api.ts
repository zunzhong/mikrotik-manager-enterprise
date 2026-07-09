import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsBackupJob,
  RouterOsBackupReport,
  RouterOsRestorePlan,
} from '../models/backup.js';

function now(): string {
  return new Date().toISOString();
}

function duration(startedAt: string, finishedAt: string): number {
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

export class BackupOrchestratorApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async run(job: RouterOsBackupJob): Promise<RouterOsBackupReport> {
    const startedAt = now();

    try {
      if (job.kind === 'binary-backup') {
        await this.runner.run('/system/backup/save', {
          attributes: {
            name: job.fileName,
          },
          timeoutMs: 30000,
        });
      } else {
        await this.runner.run('/export', {
          attributes: {
            file: job.fileName,
            terse: job.compact ?? true,
            'show-sensitive': job.includeSensitive ?? false,
          },
          timeoutMs: 30000,
        });
      }

      const finishedAt = now();

      return {
        id: job.id,
        name: job.name,
        kind: job.kind,
        fileName: job.fileName,
        success: true,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
      };
    } catch (error) {
      const finishedAt = now();

      return {
        id: job.id,
        name: job.name,
        kind: job.kind,
        fileName: job.fileName,
        success: false,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        error: error instanceof Error ? error.message : 'RouterOS backup failed',
      };
    }
  }

  public async restore(plan: RouterOsRestorePlan): Promise<RouterOsBackupReport> {
    const startedAt = now();

    try {
      if (plan.dryRun) {
        const finishedAt = now();
        return {
          id: plan.id,
          name: plan.name,
          kind: plan.kind,
          fileName: plan.fileName,
          success: true,
          startedAt,
          finishedAt,
          durationMs: duration(startedAt, finishedAt),
        };
      }

      if (plan.kind === 'binary-backup') {
        await this.runner.run('/system/backup/load', {
          attributes: {
            name: plan.fileName,
          },
          timeoutMs: 60000,
        });
      } else {
        await this.runner.run('/import', {
          attributes: {
            fileName: plan.fileName,
          },
          timeoutMs: 60000,
        });
      }

      if (plan.rebootAfterRestore) {
        await this.runner.run('/system/reboot');
      }

      const finishedAt = now();

      return {
        id: plan.id,
        name: plan.name,
        kind: plan.kind,
        fileName: plan.fileName,
        success: true,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
      };
    } catch (error) {
      const finishedAt = now();

      return {
        id: plan.id,
        name: plan.name,
        kind: plan.kind,
        fileName: plan.fileName,
        success: false,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        error: error instanceof Error ? error.message : 'RouterOS restore failed',
      };
    }
  }
}
