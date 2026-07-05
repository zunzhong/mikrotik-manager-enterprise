import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsConfigChange,
  RouterOsConfigSnapshot,
  RouterOsSyncPlan,
  RouterOsSyncResult,
} from '../models/config-diff.js';
import { normalizeConfigList } from '../utils/config-normalizer.js';

function now(): string {
  return new Date().toISOString();
}

function duration(startedAt: string, finishedAt: string): number {
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

export class ConfigSyncApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async snapshot(input: {
    id?: string;
    name: string;
    paths: string[];
    deviceIdentity?: string;
  }): Promise<RouterOsConfigSnapshot> {
    const items = [];

    for (const path of input.paths) {
      const records = await this.runner.print(`${path}/print`);
      items.push(...normalizeConfigList(path, records));
    }

    return {
      id: input.id ?? `snapshot-${Date.now()}`,
      name: input.name,
      collectedAt: now(),
      deviceIdentity: input.deviceIdentity,
      items,
    };
  }

  public createPlan(input: {
    name: string;
    changes: RouterOsConfigChange[];
    dryRun?: boolean;
  }): RouterOsSyncPlan {
    return {
      id: `sync-${Date.now()}`,
      name: input.name,
      createdAt: now(),
      dryRun: input.dryRun ?? false,
      changes: input.changes,
    };
  }

  public async apply(plan: RouterOsSyncPlan): Promise<RouterOsSyncResult> {
    const startedAt = now();
    const errors: RouterOsSyncResult['errors'] = [];
    let applied = 0;
    let skipped = 0;

    for (const change of plan.changes) {
      try {
        if (plan.dryRun) {
          skipped += 1;
          continue;
        }

        if (change.type === 'added' && change.after) {
          await this.runner.add(`${change.path}/add`, change.after.attributes);
          applied += 1;
          continue;
        }

        if (change.type === 'removed' && change.before?.id) {
          await this.runner.remove(`${change.path}/remove`, change.before.id);
          applied += 1;
          continue;
        }

        if (change.type === 'changed' && change.after?.id && change.changedAttributes) {
          const attributes: Record<string, string | undefined> = {
            numbers: change.after.id,
          };

          for (const [key, value] of Object.entries(change.changedAttributes)) {
            attributes[key] = value.after;
          }

          await this.runner.set(`${change.path}/set`, attributes);
          applied += 1;
          continue;
        }

        skipped += 1;
      } catch (error) {
        errors.push({
          key: change.key,
          error: error instanceof Error ? error.message : 'Config sync failed',
        });
      }
    }

    const finishedAt = now();

    return {
      id: plan.id,
      name: plan.name,
      dryRun: plan.dryRun ?? false,
      success: errors.length === 0,
      startedAt,
      finishedAt,
      durationMs: duration(startedAt, finishedAt),
      applied,
      skipped,
      errors,
    };
  }
}
