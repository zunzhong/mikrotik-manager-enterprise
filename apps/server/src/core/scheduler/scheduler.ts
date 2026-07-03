import { eventBus } from '../events/event-bus.js';
import { jobQueue } from '../jobs/job-queue.js';
import type { ScheduledTask } from './scheduler.types.js';

/**
 * Scheduler
 *
 * In-process interval scheduler.
 * Later this can become a distributed scheduler.
 */
export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();
  private timer: NodeJS.Timeout | null = null;

  public register(task: Omit<ScheduledTask, 'id' | 'nextRunAt'> & { id?: string }): ScheduledTask {
    const registered: ScheduledTask = {
      id: task.id ?? crypto.randomUUID(),
      name: task.name,
      jobType: task.jobType,
      intervalMs: task.intervalMs,
      enabled: task.enabled,
      lastRunAt: task.lastRunAt,
      nextRunAt: new Date(Date.now() + task.intervalMs),
    };

    this.tasks.set(registered.id, registered);
    return registered;
  }

  public start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, 1000);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  public list(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  private async tick(): Promise<void> {
    const now = Date.now();

    for (const task of this.tasks.values()) {
      if (!task.enabled || !task.nextRunAt || task.nextRunAt.getTime() > now) {
        continue;
      }

      task.lastRunAt = new Date();
      task.nextRunAt = new Date(now + task.intervalMs);

      await jobQueue.enqueue(task.jobType, {
        scheduledTaskId: task.id,
        scheduledTaskName: task.name,
      });

      await eventBus.emit('schedule.triggered', {
        id: task.id,
        name: task.name,
        jobType: task.jobType,
      });
    }
  }
}

export const scheduler = new Scheduler();
