import { eventBus } from '../../../core/index.js';
import { alertRules } from '../domain/alert-rules.js';
import { alertRepository, type CreateAlertInput } from '../infrastructure/alert.repository.js';
import { alertRuleEvaluators } from './alert-rule-registry.js';

export interface EvaluateAlertsInput {
  deviceId?: string;
  staleSnapshotHours?: number;
  lowComplianceThreshold?: number;
  createAlerts?: boolean;
}

export class AlertService {
  public listRules() {
    return alertRules;
  }

  public list() {
    return alertRepository.list();
  }

  public create(input: CreateAlertInput) {
    return alertRepository.create(input);
  }

  public acknowledge(id: string) {
    return alertRepository.acknowledge(id);
  }

  public async evaluate(input: EvaluateAlertsInput = {}) {
    const context = {
      deviceId: input.deviceId,
      staleSnapshotHours: input.staleSnapshotHours ?? 24,
      lowComplianceThreshold: input.lowComplianceThreshold ?? 80,
    };

    const evaluations = [];

    for (const evaluator of alertRuleEvaluators) {
      if (!evaluator.rule.enabledByDefault) {
        continue;
      }

      const results = await evaluator.evaluate(context);
      evaluations.push(...results);
    }

    const triggered = evaluations.filter((item) => item.triggered);

    if (input.createAlerts ?? true) {
      for (const item of triggered) {
        const alert = await alertRepository.create({
          deviceId: item.deviceId,
          ruleKey: item.rule.key,
          severity: item.rule.severity,
          title: item.title,
          message: item.message,
          source: item.rule.source,
          metadata: item.metadata,
        });

        await eventBus.emit('alert.created', {
          alertId: alert.id,
          ruleKey: item.rule.key,
          deviceId: item.deviceId,
        });
      }
    }

    return {
      evaluatedRules: alertRuleEvaluators.length,
      triggered: triggered.length,
      results: triggered,
    };
  }
}

export const alertService = new AlertService();
