export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type HealthIssueCode =
  | 'CPU_HIGH'
  | 'MEMORY_LOW'
  | 'DISK_LOW'
  | 'TEMPERATURE_HIGH'
  | 'VOLTAGE_WARNING'
  | 'UNKNOWN';

export interface HealthIssue {
  code: HealthIssueCode;
  status: HealthStatus;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  unit?: string;
  recommendation?: string;
}

export interface HealthReport {
  score: number;
  status: HealthStatus;
  issues: HealthIssue[];
  evaluatedAt: string;
}

export interface RouterOsResourceLike {
  cpuLoad?: string | number;
  freeMemory?: string | number;
  totalMemory?: string | number;
  freeHddSpace?: string | number;
  totalHddSpace?: string | number;
  [key: string]: unknown;
}

export interface RouterOsHealthLike {
  name?: string;
  value?: string | number;
  type?: string;
  [key: string]: unknown;
}
