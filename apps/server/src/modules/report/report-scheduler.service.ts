import { reportService } from './report.service.js';

const REPORT_SCHEDULER_TICK_MS = 30_000;

export class ReportSchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;

  public start(onError: (error: unknown) => void = () => undefined): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.inFlight) return;
      this.inFlight = true;
      void reportService
        .runDue()
        .catch(onError)
        .finally(() => {
          this.inFlight = false;
        });
    }, REPORT_SCHEDULER_TICK_MS);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.inFlight = false;
  }
}

export const reportSchedulerService = new ReportSchedulerService();
