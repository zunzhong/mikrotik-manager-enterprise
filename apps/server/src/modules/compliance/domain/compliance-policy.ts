export type ComplianceSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceStatus = 'pass' | 'fail' | 'warning' | 'unknown';

export interface CompliancePolicy {
  key: string;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  category: string;
}

export const compliancePolicies: CompliancePolicy[] = [
  {
    key: 'services.api.enabled',
    title: 'RouterOS API service visible',
    description: 'Inventory should include /ip/service data and API service should be visible.',
    severity: 'medium',
    category: 'services',
  },
  {
    key: 'services.api-ssl.enabled',
    title: 'API-SSL service visible',
    description: 'API-SSL should be available for secure RouterOS API access.',
    severity: 'high',
    category: 'services',
  },
  {
    key: 'services.ssh.enabled',
    title: 'SSH service visible',
    description: 'SSH service should be available for secure administrative access.',
    severity: 'medium',
    category: 'services',
  },
  {
    key: 'system.default-admin.present',
    title: 'Default admin user detection',
    description: 'Default admin user should be reviewed and disabled/renamed where possible.',
    severity: 'high',
    category: 'system',
  },
  {
    key: 'system.clock.visible',
    title: 'Clock/NTP visibility',
    description: 'System clock inventory should be available for time compliance.',
    severity: 'low',
    category: 'system',
  },
  {
    key: 'automation.scheduler.visible',
    title: 'Scheduler visibility',
    description: 'Scheduler inventory should be available for automation and backup compliance.',
    severity: 'low',
    category: 'automation',
  },
];
