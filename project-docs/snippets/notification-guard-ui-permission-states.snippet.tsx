import {
  NotificationPermissionGate,
  NotificationPermissionNotice,
  getNotificationPermissionState,
} from '../modules/notification-guard';

// Example only. Place this inside the existing Notification Dashboard component
// after reading the current auth/session principal.
const principal = {
  permissions: authSession.currentUser?.permissions ?? [],
  roles: authSession.currentUser?.roles ?? [],
  isSuperAdmin: authSession.currentUser?.isSuperAdmin ?? false,
  authenticated: authSession.currentUser?.authenticated ?? false,
};

const notificationPermissions = getNotificationPermissionState(principal);

<NotificationPermissionNotice principal={principal} />;

<NotificationPermissionGate principal={principal} action="manage" mode="disable">
  <button disabled={!notificationPermissions.canManage}>Create channel</button>
</NotificationPermissionGate>;

<NotificationPermissionGate principal={principal} action="retry" mode="disable">
  <button disabled={!notificationPermissions.canRetry}>Retry failed</button>
</NotificationPermissionGate>;

<NotificationPermissionGate principal={principal} action="test" mode="disable">
  <button disabled={!notificationPermissions.canTest}>Send test</button>
</NotificationPermissionGate>;

<NotificationPermissionGate principal={principal} action="send" mode="disable">
  <button disabled={!notificationPermissions.canSend}>Process pending</button>
</NotificationPermissionGate>;
