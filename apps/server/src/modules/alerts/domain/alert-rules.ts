export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  key: string;
  title: string;
  severity: AlertSeverity;
  source: string;
  description: string;
  enabledByDefault: boolean;
}

export const alertRules: AlertRule[] = [
  {
    key: 'job.failed',
    title: 'Job failed',
    severity: 'warning',
    source: 'core.jobs',
    description: 'A background job failed.',
    enabledByDefault: true,
  },
  {
    key: 'collector.inventory.failed',
    title: 'Inventory collector failed',
    severity: 'critical',
    source: 'collector',
    description: 'Inventory collection failed for a device.',
    enabledByDefault: true,
  },
  {
    key: 'inventory.diff.detected',
    title: 'Inventory change detected',
    severity: 'info',
    source: 'inventory',
    description: 'A device inventory diff was generated.',
    enabledByDefault: true,
  },
  {
    key: 'compliance.failed',
    title: 'Compliance failed',
    severity: 'warning',
    source: 'compliance',
    description: 'A device compliance scan has failed policies.',
    enabledByDefault: true,
  },
  {
    key: 'device.no-snapshot',
    title: 'Device has no inventory snapshot',
    severity: 'warning',
    source: 'inventory',
    description: 'Device exists but has no collected inventory snapshot.',
    enabledByDefault: true,
  },
  {
    key: 'device.no-recent-snapshot',
    title: 'Device inventory is stale',
    severity: 'warning',
    source: 'inventory',
    description: 'Latest inventory snapshot is older than the accepted freshness window.',
    enabledByDefault: true,
  },
  {
    key: 'device.low-compliance-score',
    title: 'Low compliance score',
    severity: 'critical',
    source: 'compliance',
    description: 'Latest compliance report is below the threshold.',
    enabledByDefault: true,
  },
  {
    key: 'device.no-successful-backup',
    title: 'No successful backup',
    severity: 'warning',
    source: 'backup',
    description: 'Device has no completed backup record.',
    enabledByDefault: true,
  },
];
