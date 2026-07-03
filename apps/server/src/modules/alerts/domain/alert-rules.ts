export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  key: string;
  title: string;
  severity: AlertSeverity;
  source: string;
  description: string;
}

export const alertRules: AlertRule[] = [
  {
    key: 'job.failed',
    title: 'Job failed',
    severity: 'warning',
    source: 'core.jobs',
    description: 'A background job failed.',
  },
  {
    key: 'collector.inventory.failed',
    title: 'Inventory collector failed',
    severity: 'critical',
    source: 'collector',
    description: 'Inventory collection failed for a device.',
  },
  {
    key: 'inventory.diff.detected',
    title: 'Inventory change detected',
    severity: 'info',
    source: 'inventory',
    description: 'A device inventory diff was generated.',
  },
  {
    key: 'compliance.failed',
    title: 'Compliance failed',
    severity: 'warning',
    source: 'compliance',
    description: 'A device compliance scan has failed policies.',
  },
];
