import { eventBus } from '../events/event-bus.js';
import { JobStatus, type Job, type JobHandler } from './job.types.js';

/**
 * JobQueue
 *
 * Small in-memory queue for early development.
 * It will later be replaced by Redis/BullMQ without changing module APIs.
 */
export class JobQueue {
  private readonly jobs = new Map<string, Job>();
  private readonly handlers = new Map<string, JobHandler>();
  private running = false;

  public registerHandler<TPayload = unknown>(type: string, handler: JobHandler<TPayload>): void {
    if (this.handlers.has(type)) {
      throw new Error(`Job handler already registered: ${type}`);
    }

    this.handlers.set(type, handler as JobHandler);
  }

  public async enqueue<TPayload = unknown>(
    type: string,
    payload: TPayload,
    options: { maxAttempts?: number } = {},
  ): Promise<Job<TPayload>> {
    const job: Job<TPayload> = {
      id: crypto.randomUUID(),
      type,
      payload,
      status: JobStatus.Pending,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 1,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job as Job);
    await eventBus.emit('job.created', { id: job.id, type: job.type });

    queueMicrotask(() => {
      void this.process();
    });

    return job;
  }

  public list(): Job[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  public async process(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      for (const job of this.jobs.values()) {
        if (job.status !== JobStatus.Pending) {
          continue;
        }

        await this.runJob(job);
      }
    } finally {
      this.running = false;
    }
  }

  private async runJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      job.status = JobStatus.Failed;
      job.error = `No handler registered for job type: ${job.type}`;
      job.failedAt = new Date();
      await eventBus.emit('job.failed', { id: job.id, type: job.type, error: job.error });
      return;
    }

    job.status = JobStatus.Running;
    job.startedAt = new Date();
    job.attempts += 1;

    await eventBus.emit('job.started', { id: job.id, type: job.type });

    try {
      await handler(job);
      job.status = JobStatus.Completed;
      job.completedAt = new Date();
      await eventBus.emit('job.completed', { id: job.id, type: job.type });
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts < job.maxAttempts) {
        job.status = JobStatus.Pending;
        await eventBus.emit('job.retry', { id: job.id, type: job.type, attempts: job.attempts });
        return;
      }

      job.status = JobStatus.Failed;
      job.failedAt = new Date();
      await eventBus.emit('job.failed', { id: job.id, type: job.type, error: job.error });
    }
  }
}

export const jobQueue = new JobQueue();
