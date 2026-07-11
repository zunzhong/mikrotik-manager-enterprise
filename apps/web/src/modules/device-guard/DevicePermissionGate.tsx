import type { ReactNode } from 'react';
import { getDevicePermissionState, type DeviceGuardPrincipal } from './device-permissions';
import './device-guard.css';

export type DevicePermissionAction =
  'read' | 'manage' | 'connect' | 'sync' | 'test' | 'ping' | 'backup' | 'supout' | 'reboot';

export interface DevicePermissionGateProps {
  principal?: DeviceGuardPrincipal | null;
  action: DevicePermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'disable';
  disabledClassName?: string;
}

function isAllowed(action: DevicePermissionAction, principal?: DeviceGuardPrincipal | null) {
  const state = getDevicePermissionState(principal);

  switch (action) {
    case 'read':
      return state.canRead;
    case 'manage':
      return state.canManage;
    case 'connect':
      return state.canConnect;
    case 'sync':
      return state.canSync;
    case 'test':
      return state.canTest;
    case 'ping':
      return state.canPing;
    case 'backup':
      return state.canBackup;
    case 'supout':
      return state.canSupout;
    case 'reboot':
      return state.canReboot;
    default:
      return false;
  }
}

export function DevicePermissionGate({
  principal,
  action,
  children,
  fallback = null,
  mode = 'hide',
  disabledClassName = 'device-permission-disabled',
}: DevicePermissionGateProps) {
  const allowed = isAllowed(action, principal);

  if (allowed) {
    return <>{children}</>;
  }

  if (mode === 'hide') {
    return <>{fallback}</>;
  }

  return (
    <span className={disabledClassName} aria-disabled="true">
      {children}
    </span>
  );
}
