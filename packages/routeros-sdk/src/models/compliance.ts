export type RouterOsComplianceSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface RouterOsAuditFinding {
  id: string;
  title: string;
  description: string;
  severity: RouterOsComplianceSeverity;
  category: string;
  passed: boolean;
  evidence?: Record<string, unknown>;
  remediation?: {
    description: string;
    commands?: Array<{
      path: string;
      attributes?: Record<string, string | number | boolean | undefined | null>;
    }>;
  };
}

export interface RouterOsComplianceRule {
  id: string;
  title: string;
  category: string;
  severity: RouterOsComplianceSeverity;
  evaluate(context: RouterOsComplianceContext): Promise<RouterOsAuditFinding>;
}

export interface RouterOsComplianceContext {
  services: Array<Record<string, string>>;
  users: Array<Record<string, string>>;
  firewallFilter: Array<Record<string, string>>;
  identity?: Record<string, string>;
  resource?: Record<string, string>;
}

export interface RouterOsComplianceReport {
  id: string;
  name: string;
  generatedAt: string;
  passed: boolean;
  score: number;
  total: number;
  passedCount: number;
  failedCount: number;
  findings: RouterOsAuditFinding[];
}
