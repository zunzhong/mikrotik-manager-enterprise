export const JobStatus = {
  Pending: 'pending',
  Running: 'running',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export interface Job<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export type JobHandler<TPayload = unknown> = (job: Job<TPayload>) => Promise<void>;
