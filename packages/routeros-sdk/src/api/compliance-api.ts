import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsAuditFinding,
  RouterOsComplianceContext,
  RouterOsComplianceReport,
  RouterOsComplianceRule,
} from '../models/compliance.js';
import { baselineComplianceRules } from '../rules/baseline-rules.js';

function score(findings: RouterOsAuditFinding[]): number {
  if (findings.length === 0) return 100;
  const passed = findings.filter((finding) => finding.passed).length;
  return Math.round((passed / findings.length) * 100);
}

export class ComplianceApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async collectContext(): Promise<RouterOsComplianceContext> {
    const [services, users, firewallFilter, identity, resource] = await Promise.all([
      this.runner.print('/ip/service/print'),
      this.runner.print('/user/print'),
      this.runner.print('/ip/firewall/filter/print'),
      this.runner.printOne('/system/identity/print'),
      this.runner.printOne('/system/resource/print'),
    ]);

    return {
      services,
      users,
      firewallFilter,
      identity,
      resource,
    };
  }

  public async run(
    input: {
      name?: string;
      rules?: RouterOsComplianceRule[];
    } = {},
  ): Promise<RouterOsComplianceReport> {
    const context = await this.collectContext();
    const rules = input.rules ?? baselineComplianceRules;
    const findings = [];

    for (const rule of rules) {
      findings.push(await rule.evaluate(context));
    }

    const passedCount = findings.filter((finding) => finding.passed).length;
    const failedCount = findings.length - passedCount;

    return {
      id: `compliance-${Date.now()}`,
      name: input.name ?? 'RouterOS baseline compliance',
      generatedAt: new Date().toISOString(),
      passed: failedCount === 0,
      score: score(findings),
      total: findings.length,
      passedCount,
      failedCount,
      findings,
    };
  }
}
