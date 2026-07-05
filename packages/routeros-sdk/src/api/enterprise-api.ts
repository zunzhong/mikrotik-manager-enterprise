import { BatchRunner } from '../core/batch-runner.js';
import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsBatchPlan, RouterOsBatchResult } from '../models/transaction.js';

export class EnterpriseApi {
  private readonly batchRunner: BatchRunner;

  public constructor(runner: CommandRunner) {
    this.batchRunner = new BatchRunner(runner);
  }

  public runBatch(plan: RouterOsBatchPlan): Promise<RouterOsBatchResult> {
    return this.batchRunner.execute(plan);
  }

  public dryRun(plan: RouterOsBatchPlan): Promise<RouterOsBatchResult> {
    return this.batchRunner.execute({
      ...plan,
      dryRun: true,
    });
  }

  public async rollback(result: RouterOsBatchResult): Promise<RouterOsBatchResult | null> {
    if (!result.rollbackPlan) return null;
    return this.batchRunner.execute(result.rollbackPlan);
  }
}
