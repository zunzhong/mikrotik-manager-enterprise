import { alertRules } from '../domain/alert-rules.js';
import { alertEvaluationRepository } from '../infrastructure/alert-evaluation.repository.js';
import type {
  AlertEvaluationContext,
  AlertEvaluationResult,
  AlertRuleEvaluator,
} from './alert-rule-evaluator.types.js';

const byKey = Object.fromEntries(alertRules.map((rule) => [rule.key, rule]));

function result(input: AlertEvaluationResult): AlertEvaluationResult {
  return input;
}

export const alertRuleEvaluators: AlertRuleEvaluator[] = [
  {
    rule: byKey['device.no-snapshot'],
    async evaluate(context: AlertEvaluationContext) {
      const devices = await alertEvaluationRepository.listDevices(context.deviceId);
      const results: AlertEvaluationResult[] = [];

      for (const device of devices) {
        const snapshot = await alertEvaluationRepository.latestSnapshot(device.id);

        if (!snapshot) {
          results.push(result({
            rule: byKey['device.no-snapshot'],
            triggered: true,
            deviceId: device.id,
            title: 'Device has no inventory snapshot',
            message: `${device.name} has no inventory snapshot yet.`,
            metadata: { device },
          }));
        }
      }

      return results;
    },
  },
  {
    rule: byKey['device.no-recent-snapshot'],
    async evaluate(context: AlertEvaluationContext) {
      const devices = await alertEvaluationRepository.listDevices(context.deviceId);
      const results: AlertEvaluationResult[] = [];
      const maxAgeMs = context.staleSnapshotHours * 60 * 60 * 1000;

      for (const device of devices) {
        const snapshot = await alertEvaluationRepository.latestSnapshot(device.id);
        if (!snapshot) continue;

        const ageMs = Date.now() - snapshot.collectedAt.getTime();
        if (ageMs > maxAgeMs) {
          results.push(result({
            rule: byKey['device.no-recent-snapshot'],
            triggered: true,
            deviceId: device.id,
            title: 'Device inventory is stale',
            message: `${device.name} latest inventory snapshot is older than ${context.staleSnapshotHours} hours.`,
            metadata: {
              device,
              snapshot,
              ageHours: Math.round(ageMs / 60 / 60 / 1000),
            },
          }));
        }
      }

      return results;
    },
  },
  {
    rule: byKey['device.low-compliance-score'],
    async evaluate(context: AlertEvaluationContext) {
      const devices = await alertEvaluationRepository.listDevices(context.deviceId);
      const results: AlertEvaluationResult[] = [];

      for (const device of devices) {
        const report = await alertEvaluationRepository.latestComplianceReport(device.id);
        if (!report) continue;

        if (report.score < context.lowComplianceThreshold) {
          results.push(result({
            rule: byKey['device.low-compliance-score'],
            triggered: true,
            deviceId: device.id,
            title: 'Low compliance score',
            message: `${device.name} compliance score is ${report.score}%.`,
            metadata: { device, report, threshold: context.lowComplianceThreshold },
          }));
        }
      }

      return results;
    },
  },
  {
    rule: byKey['device.no-successful-backup'],
    async evaluate(context: AlertEvaluationContext) {
      const devices = await alertEvaluationRepository.listDevices(context.deviceId);
      const results: AlertEvaluationResult[] = [];

      for (const device of devices) {
        const backup = await alertEvaluationRepository.latestCompletedBackup(device.id);

        if (!backup) {
          results.push(result({
            rule: byKey['device.no-successful-backup'],
            triggered: true,
            deviceId: device.id,
            title: 'No successful backup',
            message: `${device.name} has no completed backup record.`,
            metadata: { device },
          }));
        }
      }

      return results;
    },
  },
].filter((evaluator) => evaluator.rule !== undefined);
