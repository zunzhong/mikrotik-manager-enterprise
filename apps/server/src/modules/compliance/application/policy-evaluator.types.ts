import type { CompliancePolicy, ComplianceStatus } from '../domain/compliance-policy.js';

export interface InventoryItemLike {
  raw: unknown;
}

export interface InventorySectionLike {
  path: string;
  category: string;
  name: string;
  itemCount: number;
  items: InventoryItemLike[];
}

export interface ComplianceEvaluationContext {
  sections: Map<string, InventorySectionLike>;
}

export interface ComplianceEvaluationResult {
  policyKey: string;
  severity: string;
  status: ComplianceStatus;
  message: string;
  evidence?: Record<string, unknown>;
}

export interface CompliancePolicyEvaluator {
  policy: CompliancePolicy;
  evaluate(context: ComplianceEvaluationContext): ComplianceEvaluationResult;
}
