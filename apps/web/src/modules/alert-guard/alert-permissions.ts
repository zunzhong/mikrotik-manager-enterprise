export type AlertPermission =
  | 'alert:read'
  | 'alert:update'
  | 'alert:acknowledge'
  | 'alert:resolve'
  | 'alert:silence'
  | 'alert:bulk'
  | 'alert:manage';

export interface AlertGuardPrincipal {
  permissions?: string[];
  roles?: string[];
  isSuperAdmin?: boolean;
  authenticated?: boolean;
}

export interface AlertPermissionState {
  canRead: boolean;
  canUpdate: boolean;
  canAcknowledge: boolean;
  canResolve: boolean;
  canSilence: boolean;
  canBulk: boolean;
  canManage: boolean;
  missingUpdateReason: string;
  missingAcknowledgeReason: string;
  missingResolveReason: string;
  missingSilenceReason: string;
  missingBulkReason: string;
  missingManageReason: string;
}

function hasPermission(principal: AlertGuardPrincipal | null | undefined, permission: string) {
  if (!principal) {
    return false;
  }

  if (principal.isSuperAdmin) {
    return true;
  }

  return principal.permissions?.includes(permission) ?? false;
}

function hasAnyPermission(
  principal: AlertGuardPrincipal | null | undefined,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(principal, permission));
}

export function getAlertPermissionState(
  principal: AlertGuardPrincipal | null | undefined,
): AlertPermissionState {
  const canManage = hasPermission(principal, 'alert:manage');
  const canUpdate = hasAnyPermission(principal, ['alert:update', 'alert:manage']);
  const canRead =
    canManage ||
    canUpdate ||
    hasPermission(principal, 'alert:read') ||
    hasPermission(principal, 'dashboard:read');
  const canAcknowledge = hasAnyPermission(principal, [
    'alert:acknowledge',
    'alert:update',
    'alert:manage',
  ]);
  const canResolve = hasAnyPermission(principal, ['alert:resolve', 'alert:update', 'alert:manage']);
  const canSilence = hasAnyPermission(principal, ['alert:silence', 'alert:update', 'alert:manage']);
  const canBulk = hasAnyPermission(principal, ['alert:bulk', 'alert:update', 'alert:manage']);

  return {
    canRead,
    canUpdate,
    canAcknowledge,
    canResolve,
    canSilence,
    canBulk,
    canManage,
    missingUpdateReason: 'Cần quyền alert:update hoặc alert:manage để cập nhật alert.',
    missingAcknowledgeReason:
      'Cần quyền alert:acknowledge, alert:update hoặc alert:manage để acknowledge alert.',
    missingResolveReason:
      'Cần quyền alert:resolve, alert:update hoặc alert:manage để resolve alert.',
    missingSilenceReason:
      'Cần quyền alert:silence, alert:update hoặc alert:manage để silence alert.',
    missingBulkReason:
      'Cần quyền alert:bulk, alert:update hoặc alert:manage để thao tác bulk alert.',
    missingManageReason: 'Cần quyền alert:manage để quản trị Alert Engine.',
  };
}

export function alertPermissionLabel(permission: AlertPermission): string {
  switch (permission) {
    case 'alert:read':
      return 'Xem alert';
    case 'alert:update':
      return 'Cập nhật alert';
    case 'alert:acknowledge':
      return 'Acknowledge alert';
    case 'alert:resolve':
      return 'Resolve alert';
    case 'alert:silence':
      return 'Silence alert';
    case 'alert:bulk':
      return 'Bulk alert';
    case 'alert:manage':
      return 'Quản trị alert';
    default:
      return permission;
  }
}
