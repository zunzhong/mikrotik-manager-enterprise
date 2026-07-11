import {
  AlertPermissionGate,
  AlertPermissionNotice,
  getAlertPermissionState,
} from '../modules/alert-guard';

// Example only. Place this inside the existing Alert UI component
// after reading the current auth/session principal.
const principal = {
  permissions: authSession.currentUser?.permissions ?? [],
  roles: authSession.currentUser?.roles ?? [],
  isSuperAdmin: authSession.currentUser?.isSuperAdmin ?? false,
  authenticated: authSession.currentUser?.authenticated ?? false,
};

const alertPermissions = getAlertPermissionState(principal);

<AlertPermissionNotice principal={principal} />;

<AlertPermissionGate principal={principal} action="acknowledge" mode="disable">
  <button disabled={!alertPermissions.canAcknowledge}>Acknowledge</button>
</AlertPermissionGate>;

<AlertPermissionGate principal={principal} action="resolve" mode="disable">
  <button disabled={!alertPermissions.canResolve}>Resolve</button>
</AlertPermissionGate>;

<AlertPermissionGate principal={principal} action="silence" mode="disable">
  <button disabled={!alertPermissions.canSilence}>Silence</button>
</AlertPermissionGate>;

<AlertPermissionGate principal={principal} action="bulk" mode="disable">
  <button disabled={!alertPermissions.canBulk}>Bulk action</button>
</AlertPermissionGate>;
