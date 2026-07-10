import {
  getNotificationPermissionState,
  type NotificationGuardPrincipal,
} from './notification-permissions';
import './notification-guard.css';

export interface NotificationPermissionNoticeProps {
  principal?: NotificationGuardPrincipal | null;
}

export function NotificationPermissionNotice({ principal }: NotificationPermissionNoticeProps) {
  const state = getNotificationPermissionState(principal);

  if (state.canManage && state.canRetry && state.canTest && state.canSend) {
    return (
      <div className="notification-permission-notice notification-permission-notice-ok">
        Bạn có đủ quyền thao tác Notification Engine.
      </div>
    );
  }

  return (
    <div className="notification-permission-notice notification-permission-notice-warning">
      <strong>Notification permission state</strong>
      <ul>
        {!state.canManage ? <li>{state.missingManageReason}</li> : null}
        {!state.canRetry ? <li>{state.missingRetryReason}</li> : null}
        {!state.canTest ? <li>{state.missingTestReason}</li> : null}
        {!state.canSend ? <li>{state.missingSendReason}</li> : null}
      </ul>
    </div>
  );
}
