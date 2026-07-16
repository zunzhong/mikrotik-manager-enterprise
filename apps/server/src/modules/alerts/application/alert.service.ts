import { eventBus } from '../../../core/index.js';
import { alertRules } from '../domain/alert-rules.js';
import { alertRepository, type CreateAlertInput } from '../infrastructure/alert.repository.js';
import { alertRuleEvaluators } from './alert-rule-registry.js';
import { prisma } from '../../../database/index.js';
import { HttpError } from '../../../errors/http-error.js';
import { alertLifecycleService } from '../../alert-lifecycle/alert-lifecycle.service.js';

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

  public async listDeviceRules(deviceId: string) {
    await prisma.deviceAlertRuleConfig.deleteMany({
      where: {
        deviceId,
        ruleKey: { notIn: alertRules.map((rule) => rule.key) },
      },
    });
    const configs = await prisma.deviceAlertRuleConfig.findMany({ where: { deviceId } });
    const byKey = new Map(configs.map((config) => [config.ruleKey, config]));
    return alertRules.map((rule) => ({
      ...rule,
      enabled: byKey.get(rule.key)?.enabled ?? rule.enabledByDefault,
      channelIds: Array.isArray(byKey.get(rule.key)?.channelIds)
        ? (byKey.get(rule.key)?.channelIds as string[])
        : [],
      notifyAllChannels: byKey.get(rule.key)?.notifyAllChannels ?? true,
      configured: byKey.has(rule.key),
    }));
  }

  public async configureDeviceRule(
    deviceId: string,
    ruleKey: string,
    input: { enabled: boolean; channelIds?: string[]; notifyAllChannels?: boolean },
  ) {
    if (!alertRules.some((rule) => rule.key === ruleKey)) {
      throw new HttpError(404, 'ALERT_RULE_NOT_FOUND', 'Alert rule not found');
    }
    await prisma.device.findUniqueOrThrow({ where: { id: deviceId } });
    return prisma.deviceAlertRuleConfig.upsert({
      where: { deviceId_ruleKey: { deviceId, ruleKey } },
      create: {
        deviceId,
        ruleKey,
        enabled: input.enabled,
        channelIds: input.channelIds ?? [],
        notifyAllChannels: input.notifyAllChannels ?? true,
      },
      update: {
        enabled: input.enabled,
        channelIds: input.channelIds,
        notifyAllChannels: input.notifyAllChannels,
      },
    });
  }

  public async removeDeviceRuleConfig(deviceId: string, ruleKey: string) {
    await prisma.deviceAlertRuleConfig.deleteMany({ where: { deviceId, ruleKey } });
    return { deleted: true, deviceId, ruleKey };
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

  public resolve(id: string) {
    return alertRepository.resolve(id);
  }

  public async delete(id: string) {
    const deleted = await alertRepository.delete(id);
    if (deleted === 0) {
      throw new HttpError(404, 'ALERT_NOT_FOUND', 'Alert not found');
    }
    return { deleted: true, id };
  }

  public async deleteAll(deviceId?: string) {
    const deleted = await alertRepository.deleteAll(deviceId);
    return { deleted, deviceId: deviceId ?? null };
  }

  public async evaluate(input: EvaluateAlertsInput = {}) {
    const context = {
      deviceId: input.deviceId,
      staleSnapshotHours: input.staleSnapshotHours ?? 24,
      lowComplianceThreshold: input.lowComplianceThreshold ?? 80,
    };

    const evaluations = [];

    for (const evaluator of alertRuleEvaluators) {
      if (!evaluator.rule.enabledByDefault && !context.deviceId) continue;

      const results = await evaluator.evaluate(context);
      for (const result of results) {
        const deviceId = result.deviceId ?? context.deviceId;
        const config = deviceId
          ? await prisma.deviceAlertRuleConfig.findUnique({
              where: { deviceId_ruleKey: { deviceId, ruleKey: evaluator.rule.key } },
            })
          : null;
        if (config?.enabled ?? evaluator.rule.enabledByDefault) evaluations.push(result);
      }
    }

    const triggered = evaluations.filter((item) => item.triggered);

    if (input.createAlerts ?? true) {
      for (const item of triggered) {
        const config = item.deviceId
          ? await prisma.deviceAlertRuleConfig.findUnique({
              where: { deviceId_ruleKey: { deviceId: item.deviceId, ruleKey: item.rule.key } },
            })
          : null;
        const metadata = (item.metadata ?? {}) as Record<string, unknown>;
        const device = metadata.device as { name?: string } | undefined;
        const alert = await alertLifecycleService.openOrUpdate({
          deviceId: item.deviceId,
          ruleKey: item.rule.key,
          severity: item.rule.severity,
          title: item.title,
          message: item.message,
          source: item.rule.source,
          metadata: {
            ...metadata,
            deviceName: device?.name,
            deviceIdentity: device?.name,
            notificationChannelIds: Array.isArray(config?.channelIds) ? config.channelIds : [],
            notifyAllChannels: config?.notifyAllChannels ?? true,
          },
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
