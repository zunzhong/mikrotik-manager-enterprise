import type { AlertRule } from '../domain/alert-rules.js';

export interface AlertEvaluationContext {
  deviceId?: string;
  staleSnapshotHours: number;
  lowComplianceThreshold: number;
}

export interface AlertEvaluationResult {
  rule: AlertRule;
  triggered: boolean;
  deviceId?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRuleEvaluator {
  rule: AlertRule;
  evaluate(context: AlertEvaluationContext): Promise<AlertEvaluationResult[]>;
}
