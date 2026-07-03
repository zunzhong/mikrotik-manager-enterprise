export interface ScheduledTask {
  id: string;
  name: string;
  jobType: string;
  intervalMs: number;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}
