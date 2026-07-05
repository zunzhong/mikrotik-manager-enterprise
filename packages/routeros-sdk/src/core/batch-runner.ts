import type { CommandRunner } from './command-runner.js';
import type {
  RouterOsBatchCommand,
  RouterOsBatchCommandResult,
  RouterOsBatchPlan,
  RouterOsBatchResult,
  RouterOsTransactionMode,
} from '../models/transaction.js';

function now(): string {
  return new Date().toISOString();
}

function duration(startedAt: string, finishedAt: string): number {
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

export class BatchRunner {
  public constructor(private readonly runner: CommandRunner) {}

  public async execute(plan: RouterOsBatchPlan): Promise<RouterOsBatchResult> {
    const startedAt = now();
    const mode: RouterOsTransactionMode = plan.mode ?? 'stop-on-error';
    const dryRun = plan.dryRun ?? false;
    const results: RouterOsBatchCommandResult[] = [];
    const rollbackCommands: RouterOsBatchCommand[] = [];

    let failed = false;

    for (const command of plan.commands) {
      if (failed && mode === 'stop-on-error') {
        const skippedStartedAt = now();
        const skippedFinishedAt = now();

        results.push({
          id: command.id,
          path: command.path,
          description: command.description,
          success: false,
          skipped: true,
          dryRun,
          startedAt: skippedStartedAt,
          finishedAt: skippedFinishedAt,
          durationMs: duration(skippedStartedAt, skippedFinishedAt),
          error: 'Skipped because a previous command failed',
        });

        continue;
      }

      const commandStartedAt = now();

      try {
        if (!dryRun) {
          await this.runner.run(command.path, {
            attributes: command.attributes ?? {},
          });
        }

        const commandFinishedAt = now();

        results.push({
          id: command.id,
          path: command.path,
          description: command.description,
          success: true,
          dryRun,
          startedAt: commandStartedAt,
          finishedAt: commandFinishedAt,
          durationMs: duration(commandStartedAt, commandFinishedAt),
        });

        if (command.rollback) {
          rollbackCommands.unshift(command.rollback);
        }
      } catch (error) {
        failed = true;
        const commandFinishedAt = now();

        results.push({
          id: command.id,
          path: command.path,
          description: command.description,
          success: false,
          dryRun,
          startedAt: commandStartedAt,
          finishedAt: commandFinishedAt,
          durationMs: duration(commandStartedAt, commandFinishedAt),
          error: error instanceof Error ? error.message : 'Unknown RouterOS batch command error',
        });
      }
    }

    const finishedAt = now();
    const success = results.every((result) => result.success || result.skipped);

    return {
      id: plan.id,
      name: plan.name,
      success,
      dryRun,
      mode,
      startedAt,
      finishedAt,
      durationMs: duration(startedAt, finishedAt),
      results,
      rollbackPlan: rollbackCommands.length > 0
        ? {
            id: `${plan.id}-rollback`,
            name: `${plan.name} rollback`,
            mode: 'stop-on-error',
            dryRun: false,
            commands: rollbackCommands,
            createdAt: now(),
          }
        : undefined,
    };
  }
}
