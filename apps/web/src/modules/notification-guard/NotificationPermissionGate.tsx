import type { ReactNode } from 'react';
import {
  getNotificationPermissionState,
  type NotificationGuardPrincipal,
} from './notification-permissions';
import './notification-guard.css';

export type NotificationPermissionAction = 'read' | 'manage' | 'retry' | 'test' | 'send';

export interface NotificationPermissionGateProps {
  principal?: NotificationGuardPrincipal | null;
  action: NotificationPermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'disable';
  disabledClassName?: string;
}

function isAllowed(
  action: NotificationPermissionAction,
  principal?: NotificationGuardPrincipal | null,
) {
  const state = getNotificationPermissionState(principal);

  switch (action) {
    case 'read':
      return state.canRead;
    case 'manage':
      return state.canManage;
    case 'retry':
      return state.canRetry;
    case 'test':
      return state.canTest;
    case 'send':
      return state.canSend;
    default:
      return false;
  }
}

export function NotificationPermissionGate({
  principal,
  action,
  children,
  fallback = null,
  mode = 'hide',
  disabledClassName = 'notification-permission-disabled',
}: NotificationPermissionGateProps) {
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
