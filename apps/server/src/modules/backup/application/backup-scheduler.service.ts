import { backupService } from './backup.service.js';

class BackupSchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), 60_000);
    void this.tick();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await backupService.runDueSchedules();
    } finally {
      this.running = false;
    }
  }
}

export const backupSchedulerService = new BackupSchedulerService();
