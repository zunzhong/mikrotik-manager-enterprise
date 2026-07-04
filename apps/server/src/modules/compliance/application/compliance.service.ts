import { eventBus } from '../../../core/index.js';
import { compliancePolicies, type CompliancePolicy } from '../domain/compliance-policy.js';
import { complianceRepository, type CreateComplianceResultInput } from '../infrastructure/compliance.repository.js';
import { policyEvaluators } from './policy-registry.js';

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
        summary: { reason: 'No inventory snapshot found' },
        results: compliancePolicies.map((policy) => ({
          policyKey: policy.key,
          severity: policy.severity,
          status: 'unknown',
          message: 'No inventory snapshot found',
        })),
      });

      await this.emitReport(deviceId, report.id, report.status, report.score);
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

    await this.emitReport(deviceId, report.id, report.status, report.score);
    return report;
  }

  private evaluate(snapshot: Snapshot): CreateComplianceResultInput[] {
    if (!snapshot) return [];

    const sections = new Map(
      snapshot.sections.map((section) => [
        section.path,
        {
          path: section.path,
          category: section.category,
          name: section.name,
          itemCount: section.itemCount,
          items: section.items,
        },
      ]),
    );

    return policyEvaluators.map((evaluator) => evaluator.evaluate({ sections }));
  }

  private calculateScore(results: CreateComplianceResultInput[]): number {
    if (results.length === 0) return 0;

    const weights: Record<string, number> = {
      pass: 1,
      warning: 0.5,
      unknown: 0.25,
      fail: 0,
    };

    const total = results.reduce((sum, result) => sum + (weights[result.status] ?? 0), 0);
    return Math.round((total / results.length) * 100);
  }

  private createSummary(results: CreateComplianceResultInput[]) {
    return {
      total: results.length,
      pass: results.filter((result) => result.status === 'pass').length,
      warning: results.filter((result) => result.status === 'warning').length,
      fail: results.filter((result) => result.status === 'fail').length,
      unknown: results.filter((result) => result.status === 'unknown').length,
      bySeverity: results.reduce<Record<string, number>>((acc, result) => {
        acc[result.severity] = (acc[result.severity] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async emitReport(deviceId: string, reportId: string, status: string, score: number) {
    await eventBus.emit('compliance.report.created', {
      deviceId,
      reportId,
      status,
      score,
    });
  }
}

export const complianceService = new ComplianceService();
