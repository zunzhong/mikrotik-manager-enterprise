import type { RouterOsBatchCommand, RouterOsBatchPlan, RouterOsTransactionMode } from '../models/transaction.js';

export class BatchPlanBuilder {
  private readonly commands: RouterOsBatchCommand[] = [];

  public constructor(
    private readonly id: string,
    private readonly name: string,
    private mode: RouterOsTransactionMode = 'stop-on-error',
  ) {}

  public continueOnError(): this {
    this.mode = 'continue-on-error';
    return this;
  }

  public stopOnError(): this {
    this.mode = 'stop-on-error';
    return this;
  }

  public add(command: RouterOsBatchCommand): this {
    this.commands.push(command);
    return this;
  }

  public command(input: Omit<RouterOsBatchCommand, 'id'> & { id?: string }): this {
    this.commands.push({
      id: input.id ?? `cmd-${this.commands.length + 1}`,
      path: input.path,
      attributes: input.attributes,
      description: input.description,
      rollback: input.rollback,
    });
    return this;
  }

  public build(dryRun = false): RouterOsBatchPlan {
    return {
      id: this.id,
      name: this.name,
      mode: this.mode,
      dryRun,
      commands: this.commands,
      createdAt: new Date().toISOString(),
    };
  }
}
