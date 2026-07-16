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
    key: 'device.no-successful-backup',
    title: 'No successful backup',
    severity: 'warning',
    source: 'backup',
    description: 'Device has no completed backup record.',
    enabledByDefault: false,
  },
  {
    key: 'health.cpu_high',
    title: 'CPU usage is high',
    severity: 'critical',
    source: 'health-engine',
    description: 'CPU usage exceeded the safe threshold.',
    enabledByDefault: false,
  },
  {
    key: 'health.memory_low',
    title: 'Available memory is low',
    severity: 'critical',
    source: 'health-engine',
    description: 'Available RAM fell below the safe threshold.',
    enabledByDefault: false,
  },
  {
    key: 'health.disk_low',
    title: 'Available disk is low',
    severity: 'critical',
    source: 'health-engine',
    description: 'Available storage fell below the safe threshold.',
    enabledByDefault: false,
  },
  {
    key: 'health.temperature_high',
    title: 'Device temperature is high',
    severity: 'critical',
    source: 'health-engine',
    description: 'RouterOS reported a temperature above the safe threshold.',
    enabledByDefault: false,
  },
  {
    key: 'device.online',
    title: 'Device changed to Online',
    severity: 'critical',
    source: 'realtime-engine',
    description: 'Create a high-priority alert when the device becomes reachable.',
    enabledByDefault: false,
  },
  {
    key: 'device.offline',
    title: 'Device changed to Offline',
    severity: 'critical',
    source: 'realtime-engine',
    description: 'Create a high-priority alert when the device becomes unreachable.',
    enabledByDefault: false,
  },
  {
    key: 'interface.up',
    title: 'Interface changed to Up',
    severity: 'critical',
    source: 'realtime-engine',
    description: 'Create a high-priority alert when a RouterOS interface changes to Up.',
    enabledByDefault: false,
  },
  {
    key: 'interface.down',
    title: 'Interface changed to Down',
    severity: 'critical',
    source: 'realtime-engine',
    description: 'Create a high-priority alert when a RouterOS interface changes to Down.',
    enabledByDefault: false,
  },
  {
    key: 'log.error',
    title: 'RouterOS error log',
    severity: 'critical',
    source: 'routeros-log',
    description: 'Forward complete RouterOS error log records.',
    enabledByDefault: false,
  },
  {
    key: 'log.warning',
    title: 'RouterOS warning log',
    severity: 'warning',
    source: 'routeros-log',
    description: 'Forward complete RouterOS warning log records.',
    enabledByDefault: false,
  },
  {
    key: 'log.login_failed',
    title: 'RouterOS login failed',
    severity: 'critical',
    source: 'routeros-log',
    description: 'Forward complete failed-login and authentication log records.',
    enabledByDefault: false,
  },
];
