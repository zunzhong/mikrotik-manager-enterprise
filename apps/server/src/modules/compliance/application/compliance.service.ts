import { eventBus } from '../../../core/index.js';
import { compliancePolicies, type CompliancePolicy } from '../domain/compliance-policy.js';
import { complianceRepository, type CreateComplianceResultInput } from '../infrastructure/compliance.repository.js';

type Snapshot = Awaited<ReturnType<typeof complianceRepository.latestSnapshot>>;

export class ComplianceService {
  public listPolicies(): CompliancePolicy[] {
    return compliancePolicies;
  }

  public listReports(deviceId: string) {
    return complianceRepository.listReports(deviceId);
  }

  public async scan(deviceId: string) {
    const snapshot = await complianceRepository.latestSnapshot(deviceId);

    if (!snapshot) {
      const report = await complianceRepository.createReport({
        deviceId,
        status: 'unknown',
        score: 0,
        summary: {
          reason: 'No inventory snapshot found',
        },
        results: compliancePolicies.map((policy) => ({
          policyKey: policy.key,
          severity: policy.severity,
          status: 'unknown',
          message: 'No inventory snapshot found',
        })),
      });

      await eventBus.emit('compliance.report.created', {
        deviceId,
        reportId: report.id,
        status: report.status,
        score: report.score,
      });

      return report;
    }

    const results = this.evaluate(snapshot);
    const score = this.calculateScore(results);
    const status = results.some((result) => result.status === 'fail') ? 'failed' : 'passed';

    const report = await complianceRepository.createReport({
      deviceId,
      snapshotId: snapshot.id,
      status,
      score,
      summary: this.createSummary(results),
      results,
    });

    await eventBus.emit('compliance.report.created', {
      deviceId,
      reportId: report.id,
      status: report.status,
      score: report.score,
    });

    return report;
  }

  private evaluate(snapshot: Snapshot): CreateComplianceResultInput[] {
    if (!snapshot) {
      return [];
    }

    const sections = new Map(snapshot.sections.map((section) => [section.path, section]));

    return compliancePolicies.map((policy) => {
      switch (policy.key) {
        case 'services.api.enabled':
          return this.checkIpService(policy, sections, 'api');

        case 'services.api-ssl.enabled':
          return this.checkIpService(policy, sections, 'api-ssl');

        case 'services.ssh.enabled':
          return this.checkIpService(policy, sections, 'ssh');

        case 'system.default-admin.present':
          return this.checkDefaultAdmin(policy, sections);

        case 'system.clock.visible':
          return this.checkSectionVisible(policy, sections, '/system/clock/print');

        case 'automation.scheduler.visible':
          return this.checkSectionVisible(policy, sections, '/system/scheduler/print');

        default:
          return {
            policyKey: policy.key,
            severity: policy.severity,
            status: 'unknown',
            message: 'Policy evaluator is not implemented',
          };
      }
    });
  }

  private checkIpService(
    policy: CompliancePolicy,
    sections: Map<string, any>,
    serviceName: string,
  ): CreateComplianceResultInput {
    const section = sections.get('/ip/service/print');

    if (!section) {
      return {
        policyKey: policy.key,
        severity: policy.severity,
        status: 'unknown',
        message: 'IP service inventory section not found',
      };
    }

    const service = section.items.find((item: any) => {
      const raw = item.raw as Record<string, unknown>;
      return raw.name === serviceName;
    });

    if (!service) {
      return {
        policyKey: policy.key,
        severity: policy.severity,
        status: 'fail',
        message: `${serviceName} service not found`,
      };
    }

    const raw = service.raw as Record<string, unknown>;
    const disabled = raw.disabled === 'true' || raw.disabled === true;

    return {
      policyKey: policy.key,
      severity: policy.severity,
      status: disabled ? 'warning' : 'pass',
      message: disabled ? `${serviceName} service is disabled` : `${serviceName} service is enabled`,
      evidence: raw,
    };
  }

  private checkDefaultAdmin(
    policy: CompliancePolicy,
    sections: Map<string, any>,
  ): CreateComplianceResultInput {
    const section = sections.get('/user/print');

    if (!section) {
      return {
        policyKey: policy.key,
        severity: policy.severity,
        status: 'unknown',
        message: 'User inventory section not found',
      };
    }

    const admin = section.items.find((item: any) => {
      const raw = item.raw as Record<string, unknown>;
      return raw.name === 'admin';
    });

    if (!admin) {
      return {
        policyKey: policy.key,
        severity: policy.severity,
        status: 'pass',
        message: 'Default admin user not found',
      };
    }

    return {
      policyKey: policy.key,
      severity: policy.severity,
      status: 'warning',
      message: 'Default admin user exists and should be reviewed',
      evidence: admin.raw as Record<string, unknown>,
    };
  }

  private checkSectionVisible(
    policy: CompliancePolicy,
    sections: Map<string, any>,
    path: string,
  ): CreateComplianceResultInput {
    const section = sections.get(path);

    return {
      policyKey: policy.key,
      severity: policy.severity,
      status: section ? 'pass' : 'unknown',
      message: section ? `${path} inventory section found` : `${path} inventory section not found`,
      evidence: section
        ? {
            itemCount: section.itemCount,
          }
        : undefined,
    };
  }

  private calculateScore(results: CreateComplianceResultInput[]): number {
    if (results.length === 0) {
      return 0;
    }

    const passed = results.filter((result) => result.status === 'pass').length;
    return Math.round((passed / results.length) * 100);
  }

  private createSummary(results: CreateComplianceResultInput[]) {
    return {
      total: results.length,
      pass: results.filter((result) => result.status === 'pass').length,
      warning: results.filter((result) => result.status === 'warning').length,
      fail: results.filter((result) => result.status === 'fail').length,
      unknown: results.filter((result) => result.status === 'unknown').length,
    };
  }
}

export const complianceService = new ComplianceService();
