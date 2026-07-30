import { RBAC_PERMISSIONS } from './rbac.permissions.js';
import type { RbacRole } from './rbac.types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function systemRole(input: Omit<RbacRole, 'createdAt' | 'updatedAt' | 'system'>): RbacRole {
  const now = nowIso();

  return {
    ...input,
    system: true,
    createdAt: now,
    updatedAt: now,
  };
}

export const DEFAULT_RBAC_ROLES: RbacRole[] = [
  systemRole({
    id: 'owner',
    name: 'Owner',
    description: 'Full enterprise access to all resources and RBAC management.',
    permissions: [RBAC_PERMISSIONS.SUPER_ADMIN],
  }),
  systemRole({
    id: 'admin',
    name: 'Admin',
    description:
      'Can manage devices, alerts, notifications, audit export, and dashboard operations.',
    permissions: [
      RBAC_PERMISSIONS.DASHBOARD_READ,
      RBAC_PERMISSIONS.SYSTEM_READ,
      RBAC_PERMISSIONS.DEVICE_MANAGE,
      RBAC_PERMISSIONS.EVENT_READ,
      RBAC_PERMISSIONS.ALERT_MANAGE,
      RBAC_PERMISSIONS.SYSLOG_MANAGE,
      RBAC_PERMISSIONS.NOTIFICATION_MANAGE,
      RBAC_PERMISSIONS.AUDIT_READ,
      RBAC_PERMISSIONS.AUDIT_EXPORT,
      RBAC_PERMISSIONS.RBAC_READ,
    ],
  }),
  systemRole({
    id: 'operator',
    name: 'Operator',
    description: 'Can operate devices, alerts, notifications, and view audit logs.',
    permissions: [
      RBAC_PERMISSIONS.DASHBOARD_READ,
      RBAC_PERMISSIONS.SYSTEM_READ,
      RBAC_PERMISSIONS.DEVICE_READ,
      RBAC_PERMISSIONS.DEVICE_UPDATE,
      RBAC_PERMISSIONS.EVENT_READ,
      RBAC_PERMISSIONS.ALERT_READ,
      RBAC_PERMISSIONS.ALERT_UPDATE,
      RBAC_PERMISSIONS.SYSLOG_READ,
      RBAC_PERMISSIONS.NOTIFICATION_READ,
      RBAC_PERMISSIONS.NOTIFICATION_CREATE,
      RBAC_PERMISSIONS.AUDIT_READ,
    ],
  }),
  systemRole({
    id: 'auditor',
    name: 'Auditor',
    description: 'Read-only access focused on audit and compliance.',
    permissions: [
      RBAC_PERMISSIONS.DASHBOARD_READ,
      RBAC_PERMISSIONS.SYSTEM_READ,
      RBAC_PERMISSIONS.DEVICE_READ,
      RBAC_PERMISSIONS.EVENT_READ,
      RBAC_PERMISSIONS.ALERT_READ,
      RBAC_PERMISSIONS.SYSLOG_READ,
      RBAC_PERMISSIONS.NOTIFICATION_READ,
      RBAC_PERMISSIONS.AUDIT_READ,
      RBAC_PERMISSIONS.AUDIT_EXPORT,
    ],
  }),
  systemRole({
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only dashboard and operations visibility.',
    permissions: [
      RBAC_PERMISSIONS.DASHBOARD_READ,
      RBAC_PERMISSIONS.SYSTEM_READ,
      RBAC_PERMISSIONS.DEVICE_READ,
      RBAC_PERMISSIONS.EVENT_READ,
      RBAC_PERMISSIONS.ALERT_READ,
      RBAC_PERMISSIONS.SYSLOG_READ,
      RBAC_PERMISSIONS.NOTIFICATION_READ,
    ],
  }),
];
