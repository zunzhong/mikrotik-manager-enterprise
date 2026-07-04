import { compliancePolicies } from '../domain/compliance-policy.js';
import type {
  ComplianceEvaluationContext,
  ComplianceEvaluationResult,
  CompliancePolicyEvaluator,
  InventorySectionLike,
} from './policy-evaluator.types.js';

function rawOf(item: { raw: unknown }): Record<string, unknown> {
  return item.raw as Record<string, unknown>;
}

function boolDisabled(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes';
}

function findIpService(sections: Map<string, InventorySectionLike>, name: string) {
  const section = sections.get('/ip/service/print');
  return section?.items.map(rawOf).find((item) => item.name === name);
}

function makeResult(
  policyKey: string,
  severity: string,
  status: ComplianceEvaluationResult['status'],
  message: string,
  evidence?: Record<string, unknown>,
): ComplianceEvaluationResult {
  return { policyKey, severity, status, message, evidence };
}

export const policyEvaluators: CompliancePolicyEvaluator[] = compliancePolicies.map((policy) => {
  return {
    policy,
    evaluate(context: ComplianceEvaluationContext): ComplianceEvaluationResult {
      switch (policy.key) {
        case 'services.api.disabled-or-restricted': {
          const service = findIpService(context.sections, 'api');
          if (!service)
            return makeResult(
              policy.key,
              policy.severity,
              'unknown',
              'API service not found in inventory',
            );
          const disabled = boolDisabled(service.disabled);
          const address = service.address;
          if (disabled)
            return makeResult(
              policy.key,
              policy.severity,
              'pass',
              'Plain API service is disabled',
              service,
            );
          if (typeof address === 'string' && address.length > 0 && address !== '0.0.0.0/0') {
            return makeResult(
              policy.key,
              policy.severity,
              'warning',
              'Plain API is enabled but appears restricted by address',
              service,
            );
          }
          return makeResult(
            policy.key,
            policy.severity,
            'fail',
            'Plain API is enabled and not visibly restricted',
            service,
          );
        }

        case 'services.api-ssl.enabled': {
          const service = findIpService(context.sections, 'api-ssl');
          if (!service)
            return makeResult(
              policy.key,
              policy.severity,
              'unknown',
              'API-SSL service not found in inventory',
            );
          return boolDisabled(service.disabled)
            ? makeResult(
                policy.key,
                policy.severity,
                'fail',
                'API-SSL service is disabled',
                service,
              )
            : makeResult(
                policy.key,
                policy.severity,
                'pass',
                'API-SSL service is enabled',
                service,
              );
        }

        case 'services.telnet.disabled': {
          const service = findIpService(context.sections, 'telnet');
          if (!service)
            return makeResult(
              policy.key,
              policy.severity,
              'unknown',
              'Telnet service not found in inventory',
            );
          return boolDisabled(service.disabled)
            ? makeResult(policy.key, policy.severity, 'pass', 'Telnet service is disabled', service)
            : makeResult(policy.key, policy.severity, 'fail', 'Telnet service is enabled', service);
        }

        case 'services.ftp.disabled': {
          const service = findIpService(context.sections, 'ftp');
          if (!service)
            return makeResult(
              policy.key,
              policy.severity,
              'unknown',
              'FTP service not found in inventory',
            );
          return boolDisabled(service.disabled)
            ? makeResult(policy.key, policy.severity, 'pass', 'FTP service is disabled', service)
            : makeResult(policy.key, policy.severity, 'fail', 'FTP service is enabled', service);
        }

        case 'system.default-admin.review': {
          const section = context.sections.get('/user/print');
          if (!section)
            return makeResult(
              policy.key,
              policy.severity,
              'unknown',
              'User inventory section not found',
            );
          const admin = section.items.map(rawOf).find((item) => item.name === 'admin');
          if (!admin)
            return makeResult(policy.key, policy.severity, 'pass', 'Default admin user not found');
          return boolDisabled(admin.disabled)
            ? makeResult(
                policy.key,
                policy.severity,
                'warning',
                'Default admin user exists but is disabled',
                admin,
              )
            : makeResult(
                policy.key,
                policy.severity,
                'warning',
                'Default admin user exists and should be reviewed',
                admin,
              );
        }

        case 'automation.scheduler.visible': {
          const section = context.sections.get('/system/scheduler/print');
          return section
            ? makeResult(policy.key, policy.severity, 'pass', 'Scheduler inventory section found', {
                itemCount: section.itemCount,
              })
            : makeResult(
                policy.key,
                policy.severity,
                'unknown',
                'Scheduler inventory section not found',
              );
        }

        case 'system.files.visible': {
          const section = context.sections.get('/file/print');
          return section
            ? makeResult(policy.key, policy.severity, 'pass', 'File inventory section found', {
                itemCount: section.itemCount,
              })
            : makeResult(
                policy.key,
                policy.severity,
                'unknown',
                'File inventory section not found',
              );
        }

        default:
          return makeResult(
            policy.key,
            policy.severity,
            'unknown',
            'Policy evaluator is not implemented',
          );
      }
    },
  };
});
