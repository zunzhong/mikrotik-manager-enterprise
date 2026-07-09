import type {
  RouterOsAuditFinding,
  RouterOsComplianceContext,
  RouterOsComplianceRule,
} from '../models/compliance.js';

function finding(input: Omit<RouterOsAuditFinding, 'id'> & { id: string }): RouterOsAuditFinding {
  return input;
}

export const baselineComplianceRules: RouterOsComplianceRule[] = [
  {
    id: 'service-api-disabled-or-restricted',
    title: 'RouterOS API service should be disabled or restricted',
    category: 'services',
    severity: 'high',
    async evaluate(context: RouterOsComplianceContext) {
      const api = context.services.find((service) => service.name === 'api');
      const passed =
        !api || api.disabled === 'true' || api.disabled === 'yes' || Boolean(api.address);

      return finding({
        id: 'service-api-disabled-or-restricted',
        title: 'RouterOS API service should be disabled or restricted',
        description:
          'The plaintext API service should either be disabled or restricted to trusted management subnets.',
        severity: 'high',
        category: 'services',
        passed,
        evidence: { api },
        remediation: {
          description: 'Disable API or restrict it to a trusted management prefix.',
          commands: [
            { path: '/ip/service/set', attributes: { numbers: 'api', address: '10.0.0.0/24' } },
          ],
        },
      });
    },
  },
  {
    id: 'telnet-disabled',
    title: 'Telnet service should be disabled',
    category: 'services',
    severity: 'critical',
    async evaluate(context: RouterOsComplianceContext) {
      const telnet = context.services.find((service) => service.name === 'telnet');
      const passed = !telnet || telnet.disabled === 'true' || telnet.disabled === 'yes';

      return finding({
        id: 'telnet-disabled',
        title: 'Telnet service should be disabled',
        description:
          'Telnet sends credentials in plaintext and should not be enabled on production routers.',
        severity: 'critical',
        category: 'services',
        passed,
        evidence: { telnet },
        remediation: {
          description: 'Disable Telnet service.',
          commands: [{ path: '/ip/service/disable', attributes: { numbers: 'telnet' } }],
        },
      });
    },
  },
  {
    id: 'default-admin-reviewed',
    title: 'Default admin account should be reviewed',
    category: 'identity-access',
    severity: 'medium',
    async evaluate(context: RouterOsComplianceContext) {
      const admin = context.users.find((user) => user.name === 'admin');
      const passed = !admin || admin.disabled === 'true' || admin.disabled === 'yes';

      return finding({
        id: 'default-admin-reviewed',
        title: 'Default admin account should be reviewed',
        description: 'The default admin account should be disabled or renamed where possible.',
        severity: 'medium',
        category: 'identity-access',
        passed,
        evidence: { admin },
        remediation: {
          description:
            'Create a named administrator account and disable the default admin account.',
          commands: [{ path: '/user/disable', attributes: { numbers: 'admin' } }],
        },
      });
    },
  },
  {
    id: 'firewall-has-drop-rule',
    title: 'Firewall should include a drop rule',
    category: 'firewall',
    severity: 'medium',
    async evaluate(context: RouterOsComplianceContext) {
      const hasDrop = context.firewallFilter.some(
        (rule) => rule.action === 'drop' && rule.disabled !== 'true' && rule.disabled !== 'yes',
      );

      return finding({
        id: 'firewall-has-drop-rule',
        title: 'Firewall should include a drop rule',
        description: 'A production router should have explicit drop rules for unwanted traffic.',
        severity: 'medium',
        category: 'firewall',
        passed: hasDrop,
        evidence: { dropRules: context.firewallFilter.filter((rule) => rule.action === 'drop') },
        remediation: {
          description: 'Add explicit drop rules according to your network policy.',
        },
      });
    },
  },
];
