import type { ReactNode } from 'react';
import { getAlertPermissionState, type AlertGuardPrincipal } from './alert-permissions';
import './alert-guard.css';

export type AlertPermissionAction =
  'read' | 'update' | 'acknowledge' | 'resolve' | 'silence' | 'bulk' | 'manage';

export interface AlertPermissionGateProps {
  principal?: AlertGuardPrincipal | null;
  action: AlertPermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'disable';
  disabledClassName?: string;
}

function isAllowed(action: AlertPermissionAction, principal?: AlertGuardPrincipal | null) {
  const state = getAlertPermissionState(principal);

  switch (action) {
    case 'read':
      return state.canRead;
    case 'update':
      return state.canUpdate;
    case 'acknowledge':
      return state.canAcknowledge;
    case 'resolve':
      return state.canResolve;
    case 'silence':
      return state.canSilence;
    case 'bulk':
      return state.canBulk;
    case 'manage':
      return state.canManage;
    default:
      return false;
  }
}

export function AlertPermissionGate({
  principal,
  action,
  children,
  fallback = null,
  mode = 'hide',
  disabledClassName = 'alert-permission-disabled',
}: AlertPermissionGateProps) {
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
