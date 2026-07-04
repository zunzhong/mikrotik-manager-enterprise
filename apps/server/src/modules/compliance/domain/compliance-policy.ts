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
    key: 'services.api.disabled-or-restricted',
    title: 'RouterOS API should be disabled or restricted',
    description: 'Plain API should not be exposed broadly. Prefer API-SSL or restricted address ranges.',
    severity: 'high',
    category: 'services',
  },
  {
    key: 'services.api-ssl.enabled',
    title: 'API-SSL should be enabled',
    description: 'Secure RouterOS API access should use API-SSL when possible.',
    severity: 'high',
    category: 'services',
  },
  {
    key: 'services.telnet.disabled',
    title: 'Telnet should be disabled',
    description: 'Telnet is insecure and should be disabled.',
    severity: 'critical',
    category: 'services',
  },
  {
    key: 'services.ftp.disabled',
    title: 'FTP should be disabled',
    description: 'FTP is insecure and should be disabled unless explicitly required.',
    severity: 'high',
    category: 'services',
  },
  {
    key: 'system.default-admin.review',
    title: 'Default admin user should be reviewed',
    description: 'Default admin account should be disabled, renamed, or tightly controlled.',
    severity: 'high',
    category: 'system',
  },
  {
    key: 'automation.scheduler.visible',
    title: 'Scheduler inventory should be visible',
    description: 'Scheduler visibility is required for automation and backup compliance.',
    severity: 'low',
    category: 'automation',
  },
  {
    key: 'system.files.visible',
    title: 'File inventory should be visible',
    description: 'File inventory is required for backup and restore workflows.',
    severity: 'low',
    category: 'system',
  },
];
