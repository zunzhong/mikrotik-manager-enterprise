import type { RbacPermission } from './rbac.types.js';

export const RBAC_PERMISSIONS = {
  SUPER_ADMIN: '*',

  DASHBOARD_READ: 'dashboard:read',

  SYSTEM_READ: 'system:read',
  SYSTEM_MANAGE: 'system:manage',

  DEVICE_READ: 'device:read',
  DEVICE_CREATE: 'device:create',
  DEVICE_UPDATE: 'device:update',
  DEVICE_DELETE: 'device:delete',
  DEVICE_MANAGE: 'device:manage',

  EVENT_READ: 'event:read',

  ALERT_READ: 'alert:read',
  ALERT_UPDATE: 'alert:update',
  ALERT_MANAGE: 'alert:manage',

  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CREATE: 'notification:create',
  NOTIFICATION_UPDATE: 'notification:update',
  NOTIFICATION_DELETE: 'notification:delete',
  NOTIFICATION_MANAGE: 'notification:manage',

  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_PRUNE: 'audit:prune',

  RBAC_READ: 'rbac:read',
  RBAC_MANAGE: 'rbac:manage',
  RBAC_ASSIGN: 'rbac:assign',
} as const satisfies Record<string, RbacPermission>;

export const ALL_RBAC_PERMISSIONS = Object.values(RBAC_PERMISSIONS);
