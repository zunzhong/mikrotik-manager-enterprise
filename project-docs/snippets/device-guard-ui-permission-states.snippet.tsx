import {
  DevicePermissionGate,
  DevicePermissionNotice,
  getDevicePermissionState,
} from '../modules/device-guard';

// Example only. Place this inside the existing Device/Inventory UI component
// after reading the current auth/session principal.
const principal = {
  permissions: authSession.currentUser?.permissions ?? [],
  roles: authSession.currentUser?.roles ?? [],
  isSuperAdmin: authSession.currentUser?.isSuperAdmin ?? false,
  authenticated: authSession.currentUser?.authenticated ?? false,
};

const devicePermissions = getDevicePermissionState(principal);

<DevicePermissionNotice principal={principal} />;

<DevicePermissionGate principal={principal} action="manage" mode="disable">
  <button disabled={!devicePermissions.canManage}>Create device</button>
</DevicePermissionGate>;

<DevicePermissionGate principal={principal} action="connect" mode="disable">
  <button disabled={!devicePermissions.canConnect}>Test connection</button>
</DevicePermissionGate>;

<DevicePermissionGate principal={principal} action="sync" mode="disable">
  <button disabled={!devicePermissions.canSync}>Refresh inventory</button>
</DevicePermissionGate>;

<DevicePermissionGate principal={principal} action="ping" mode="disable">
  <button disabled={!devicePermissions.canPing}>Ping</button>
</DevicePermissionGate>;

<DevicePermissionGate principal={principal} action="reboot" mode="disable">
  <button disabled={!devicePermissions.canReboot}>Reboot</button>
</DevicePermissionGate>;
