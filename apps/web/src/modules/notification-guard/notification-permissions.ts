export type NotificationPermission =
  | 'notification:read'
  | 'notification:manage'
  | 'notification:retry'
  | 'notification:test'
  | 'notification:send';

export interface NotificationGuardPrincipal {
  permissions?: string[];
  roles?: string[];
  isSuperAdmin?: boolean;
  authenticated?: boolean;
}

export interface NotificationPermissionState {
  canRead: boolean;
  canManage: boolean;
  canRetry: boolean;
  canTest: boolean;
  canSend: boolean;
  missingManageReason: string;
  missingRetryReason: string;
  missingTestReason: string;
  missingSendReason: string;
}

function hasPermission(
  principal: NotificationGuardPrincipal | null | undefined,
  permission: string,
) {
  if (!principal) {
    return false;
  }

  if (principal.isSuperAdmin) {
    return true;
  }

  return principal.permissions?.includes(permission) ?? false;
}

function hasAnyPermission(
  principal: NotificationGuardPrincipal | null | undefined,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(principal, permission));
}

export function getNotificationPermissionState(
  principal: NotificationGuardPrincipal | null | undefined,
): NotificationPermissionState {
  const canManage = hasPermission(principal, 'notification:manage');
  const canRead =
    canManage ||
    hasPermission(principal, 'notification:read') ||
    hasPermission(principal, 'dashboard:read');
  const canRetry = hasAnyPermission(principal, ['notification:retry', 'notification:manage']);
  const canTest = hasAnyPermission(principal, ['notification:test', 'notification:manage']);
  const canSend = hasAnyPermission(principal, ['notification:send', 'notification:manage']);

  return {
    canRead,
    canManage,
    canRetry,
    canTest,
    canSend,
    missingManageReason: 'Cần quyền notification:manage để tạo, sửa hoặc xóa cấu hình thông báo.',
    missingRetryReason: 'Cần quyền notification:retry hoặc notification:manage để retry delivery.',
    missingTestReason:
      'Cần quyền notification:test hoặc notification:manage để gửi thông báo test.',
    missingSendReason:
      'Cần quyền notification:send hoặc notification:manage để process/send delivery.',
  };
}

export function notificationPermissionLabel(permission: NotificationPermission): string {
  switch (permission) {
    case 'notification:read':
      return 'Xem thông báo';
    case 'notification:manage':
      return 'Quản lý thông báo';
    case 'notification:retry':
      return 'Retry thông báo';
    case 'notification:test':
      return 'Gửi test thông báo';
    case 'notification:send':
      return 'Process/send thông báo';
    default:
      return permission;
  }
}
