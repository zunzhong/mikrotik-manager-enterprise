export type DevicePermission =
  'device:read' | 'device:manage' | 'device:connect' | 'device:sync' | 'device:test';

export interface DeviceGuardPrincipal {
  permissions?: string[];
  roles?: string[];
  isSuperAdmin?: boolean;
  authenticated?: boolean;
}

export interface DevicePermissionState {
  canRead: boolean;
  canManage: boolean;
  canConnect: boolean;
  canSync: boolean;
  canTest: boolean;
  canPing: boolean;
  canBackup: boolean;
  canSupout: boolean;
  canReboot: boolean;
  missingManageReason: string;
  missingConnectReason: string;
  missingSyncReason: string;
  missingTestReason: string;
  missingRebootReason: string;
}

function hasPermission(principal: DeviceGuardPrincipal | null | undefined, permission: string) {
  if (!principal) {
    return false;
  }

  if (principal.isSuperAdmin) {
    return true;
  }

  return principal.permissions?.includes(permission) ?? false;
}

function hasAnyPermission(
  principal: DeviceGuardPrincipal | null | undefined,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(principal, permission));
}

export function getDevicePermissionState(
  principal: DeviceGuardPrincipal | null | undefined,
): DevicePermissionState {
  const canManage = hasPermission(principal, 'device:manage');
  const canRead =
    canManage ||
    hasPermission(principal, 'device:read') ||
    hasPermission(principal, 'dashboard:read');
  const canConnect = hasAnyPermission(principal, [
    'device:connect',
    'device:test',
    'device:manage',
  ]);
  const canSync = hasAnyPermission(principal, ['device:sync', 'device:manage']);
  const canTest = hasAnyPermission(principal, ['device:test', 'device:connect', 'device:manage']);
  const canPing = canTest;
  const canBackup = canSync;
  const canSupout = canSync;
  const canReboot = canManage;

  return {
    canRead,
    canManage,
    canConnect,
    canSync,
    canTest,
    canPing,
    canBackup,
    canSupout,
    canReboot,
    missingManageReason: 'Cần quyền device:manage để tạo, sửa, xóa hoặc reboot thiết bị.',
    missingConnectReason:
      'Cần quyền device:connect, device:test hoặc device:manage để test kết nối.',
    missingSyncReason:
      'Cần quyền device:sync hoặc device:manage để refresh realtime/sync inventory.',
    missingTestReason:
      'Cần quyền device:test, device:connect hoặc device:manage để chạy thao tác test.',
    missingRebootReason: 'Cần quyền device:manage để reboot thiết bị.',
  };
}

export function devicePermissionLabel(permission: DevicePermission): string {
  switch (permission) {
    case 'device:read':
      return 'Xem thiết bị';
    case 'device:manage':
      return 'Quản lý thiết bị';
    case 'device:connect':
      return 'Test kết nối thiết bị';
    case 'device:sync':
      return 'Sync inventory thiết bị';
    case 'device:test':
      return 'Chạy test thiết bị';
    default:
      return permission;
  }
}
